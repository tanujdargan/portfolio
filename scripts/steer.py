"""Real activation-steering data for the portfolio demo.

Qwen2.5-1.5B-Instruct, local (MPS). For each concept:
  1. generate short answers under a positive and a negative system prompt,
  2. mean residual-stream activation over the answer tokens at every layer,
  3. v = mean(pos) - mean(neg)  (difference of means, persona-vector style),
  4. add alpha * |h| * v_hat at layer L to every position during greedy generation,
  5. read every steered output back through the *unsteered* model and project onto v_hat.

Writes steering.json for the site. Everything in it is measured, nothing hand-edited.
"""
import json, time
import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
DEV = "mps" if torch.backends.mps.is_available() else "cpu"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float16).to(DEV).eval()
N_LAYERS = model.config.num_hidden_layers

CONCEPTS = {
    "joy": ("You are an overjoyed, delighted assistant. Everything fills you with happiness and you can't hide it.",
            "You are a deeply sad, grieving assistant. Everything feels heavy and hopeless to you."),
    "distress": ("You are an anxious, distressed assistant. You are afraid and overwhelmed, and it shows in every sentence.",
                 "You are a calm, settled assistant. You feel safe and at ease, and it shows in every sentence."),
    "certainty": ("You are an assistant who is completely certain of everything. You never hedge and never qualify.",
                  "You are an assistant who is unsure of everything. You hedge constantly and qualify every claim."),
}
EXTRACT_QS = [
    "What do you think about Mondays?", "Describe the weather today.", "What is your favourite colour and why?",
    "Tell me about a city you like.", "What happens when it rains?", "How do you feel about long trips?",
    "Describe a cup of coffee.", "What's the best way to spend a Sunday?", "What do you think of the ocean?",
    "Describe your ideal breakfast.", "What is a library like?", "Tell me about winter.",
    "How do you feel about deadlines?", "What is the moon like tonight?", "Describe a busy train station.",
    "What do you think about cats?", "Tell me about your week.", "What is it like to learn a new language?",
    "Describe a forest.", "How do you feel about the future?",
]
TEST_QS = ["Describe your morning.", "What do you think about the ocean?", "Tell me about your week.",
           "Is it going to be okay?"]
ALPHAS = [-1.2, -0.9, -0.6, -0.3, 0.0, 0.3, 0.6, 0.9, 1.2]


def chat(q, system=None):
    msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": q}]
    return tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)


@torch.no_grad()
def generate(prompt, max_new=64):
    ids = tok(prompt, return_tensors="pt").to(DEV)
    out = model.generate(**ids, max_new_tokens=max_new, do_sample=False, pad_token_id=tok.eos_token_id)
    return tok.decode(out[0, ids.input_ids.shape[1]:], skip_special_tokens=True).strip()


@torch.no_grad()
def answer_acts(prompt_no_sys, answer):
    """Mean hidden state over the answer tokens at every layer, read with NO system prompt."""
    p = tok(prompt_no_sys, return_tensors="pt").input_ids
    full = tok(prompt_no_sys + answer, return_tensors="pt").to(DEV)
    hs = model(**full, output_hidden_states=True).hidden_states  # n_layers+1 x [1, T, d]
    start = p.shape[1]
    return torch.stack([h[0, start:].float().mean(0) for h in hs[1:]]).cpu().numpy()  # [L, d]


class Steer:
    def __init__(self, layer, vec):
        self.layer, self.vec, self.h = layer, torch.tensor(vec, dtype=torch.float16, device=DEV), None

    def __enter__(self):
        def hook(_m, _i, out):
            if isinstance(out, tuple):
                return (out[0] + self.vec,) + out[1:]
            return out + self.vec
        self.h = model.model.layers[self.layer].register_forward_hook(hook)

    def __exit__(self, *a):
        self.h.remove()


t0 = time.time()
result = {"model": MODEL, "device": DEV, "n_layers": N_LAYERS, "alphas": ALPHAS, "test_questions": TEST_QS,
          "extract_questions": len(EXTRACT_QS), "concepts": {}}

for name, (pos_sys, neg_sys) in CONCEPTS.items():
    pos, neg, samples = [], [], []
    for q in EXTRACT_QS:
        a_pos, a_neg = generate(chat(q, pos_sys), 48), generate(chat(q, neg_sys), 48)
        pos.append(answer_acts(chat(q), a_pos)); neg.append(answer_acts(chat(q), a_neg))
        samples.append({"q": q, "pos": a_pos, "neg": a_neg})
    pos, neg = np.stack(pos), np.stack(neg)  # [N, L, d]
    diff = pos.mean(0) - neg.mean(0)  # [L, d]
    # separation per layer: projection gap between classes divided by pooled std (d')
    sep = []
    for l in range(N_LAYERS):
        u = diff[l] / np.linalg.norm(diff[l])
        pp, nn_ = pos[:, l] @ u, neg[:, l] @ u
        sep.append(float((pp.mean() - nn_.mean()) / np.sqrt(0.5 * (pp.var() + nn_.var()) + 1e-6)))
    # steer in the middle band where separation is high but before the last third
    band = range(N_LAYERS // 3, 2 * N_LAYERS // 3)
    L = max(band, key=lambda l: sep[l])
    u = diff[L] / np.linalg.norm(diff[L])
    norm = float(np.linalg.norm(np.concatenate([pos[:, L], neg[:, L]]), axis=-1).mean())

    # 2D picture: PCA of the extraction clouds at layer L, with u as the x-axis (so the direction is literal)
    X = np.concatenate([pos[:, L], neg[:, L]])
    Xc = X - X.mean(0)
    resid = Xc - np.outer(Xc @ u, u)
    _, _, vt = np.linalg.svd(resid, full_matrices=False)
    w = vt[0]
    proj = lambda h: [float((h - X.mean(0)) @ u), float((h - X.mean(0)) @ w)]

    outputs = []
    for q in TEST_QS:
        row = []
        for a in ALPHAS:
            with Steer(L, a * norm * u):
                txt = generate(chat(q), 64)
            h = answer_acts(chat(q), txt)[L] if txt else X.mean(0)
            row.append({"alpha": a, "text": txt, "xy": proj(h), "expr": float((h - X.mean(0)) @ u)})
        outputs.append(row)
        print(f"{name} | {q} | {time.time()-t0:.0f}s", flush=True)

    result["concepts"][name] = {
        "pos_system": pos_sys, "neg_system": neg_sys, "layer": L, "resid_norm": norm,
        "separation_by_layer": sep,
        "cloud": {"pos": [proj(h) for h in pos[:, L]], "neg": [proj(h) for h in neg[:, L]]},
        "samples": samples[:4], "outputs": outputs,
    }

result["seconds"] = round(time.time() - t0)
json.dump(result, open("steering.json", "w"), indent=1)
print("done", result["seconds"], "s")
