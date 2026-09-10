export default {
  name: "ConfirmDialog",
  props: {
    open: Boolean,
    title: { type: String, default: "Are you sure?" },
    message: { type: String, default: "" },
    confirmLabel: { type: String, default: "Confirm" },
  },
  emits: ["confirm", "cancel"],
  template: `
    <dialog :open="open">
      <article>
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <footer style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button class="secondary" @click="$emit('cancel')">Cancel</button>
          <button @click="$emit('confirm')">{{ confirmLabel }}</button>
        </footer>
      </article>
    </dialog>
  `,
};
