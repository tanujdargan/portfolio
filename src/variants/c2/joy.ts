// Real data, copied from src/data/steering.json (Qwen2.5-1.5B-Instruct, joy direction, layer 17) so the hero figure
// ships in the static HTML without pulling the 37 KB file. x = projection on the joy direction, y = top residual PC.
export const MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
export const LAYER = 17
export const POS: [number, number][] = [[9.5,-3.81],[9.45,4.96],[-11.77,-8.23],[-10.07,-8.91],[1.41,15.47],[8.69,-5.36],[10.7,7.56],[0.46,-4.44],[8.67,-0.35],[6.94,4.77],[7.42,1.66],[6.44,6.7],[6.74,-6.26],[7.57,5.6],[8.67,10.71],[6.49,-5.87],[4.84,-9.61],[2.19,-5.3],[11.26,9.13],[4.49,-8.41]]
export const NEG: [number, number][] = [[-8.36,-3.19],[5.1,12.6],[-10.57,-5.02],[-11.63,-14.73],[0.1,12],[-9.38,-4.68],[5.87,4.31],[-9.46,-6.83],[-11.23,-2.86],[-7.46,-2.28],[-9.64,-1.14],[4.88,12.48],[-10.16,-3.45],[-9.12,-0.43],[7.17,9.94],[-9.96,-2.71],[-11.76,-7.26],[1.61,-4.75],[5.09,14.47],[-11.19,-6.49]]
/** Steered answers to "Describe your morning." at each strength, read back through the unsteered model. */
export const PATH: [number, number][] = [[-12.34,-5.59],[-12.92,-5.2],[-13.76,-6.18],[-11.49,-3.97],[-10.15,-4.11],[-8.02,-5.88],[9.6,1.1],[10.62,2.18],[11.87,0.95]]
export const ALPHAS = [-1.2,-0.9,-0.6,-0.3,0,0.3,0.6,0.9,1.2]
