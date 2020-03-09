const app = new Vue({
  el: "#app",
  data() {
    return {
      demoEditor: null
    }
  },
  mounted() {
    this.editInit();
  },
  methods: {
    addButton() {
      const code = this.demoEditor.getValue();
      code += '<el-button>button</el-button>';
      this.
    },
    updatePreview() {
      const previewFrame = document.getElementById('preview');
      const preview = previewFrame.contentDocument || previewFrame.contentWindow.document;
      preview.open();
      preview.write(this.demoEditor.getValue());
      preview.close();
    },
    editInit() {
      this.demoEditor = CodeMirror.fromTextArea(this.$refs.demo, {
        lineNumbers: true,
        styleActiveLine: true,
        lineWrapping: true,
        mode: 'text/html',
        autoCloseTags: true,
        dragDrop: false,
        extraKeys: {
          "Tab": "autocomplete", "F11": function (cm) {
            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
          },
          "Esc": function (cm) {
            if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
          },
          "Shift-Tab": function (cm) {
            cm.autoFormatRange(cm.getCursor(true), cm.getCursor(false))
          }
        },
        theme: 'cobalt'
      });
      this.demoEditor.setSize('auto', '100%');
      this.demoEditor.on("change", () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(this.updatePreview, 300);
      });
    }
  },
})