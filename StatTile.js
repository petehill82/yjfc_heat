export default {
  name: "StatTile",
  props: { label: String, value: [String, Number], sub: String },
  template: `
    <article style="padding:0.75rem 1rem;">
      <div style="font-size:1.6rem; font-weight:700; color:var(--club-orange-dark);">{{ value }}</div>
      <div style="font-size:0.85rem; opacity:0.8;">{{ label }}</div>
      <div v-if="sub" style="font-size:0.75rem; opacity:0.6;">{{ sub }}</div>
    </article>
  `,
};
