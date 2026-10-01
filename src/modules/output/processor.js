// @ts-check
/** @satisfies {import('../types').ModuleProcessor<Record<string, never>>} */
const processor = {
  audioOutput: true,
  createState: () => ({}),
  process({ params, inputs, connected, stereo }) {
    // The left input normals to both channels until the right jack is patched.
    const gain = params.mute > 0.5 ? 0 : params.level * 0.5;
    stereo.left = (inputs.left / 5) * gain;
    stereo.right = ((connected.right ? inputs.right : inputs.left) / 5) * gain;
  },
};
export default processor;
