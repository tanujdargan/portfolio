// Which poster classes belong to which layer of the signal. The CSS dither (s4.css) mirrors these lists.
/** hidden in the grey pass: the accent strokes get their own layer */
export const GREY_OFF = '.ac,.acd,.acl,.um,.satdot,.lb--ac,.vofill'
/** hidden in the accent pass: everything that isn't accent */
export const ACC_ONLY = '.ax,.gr,.tk,.d0,.d1,.fg,.fgd,.dt0,.dt1,.vo,.cen,.q,.miss,.ring,.band,.land,.lb:not(.lb--ac),.tok,.u0,.vis,.vic'
