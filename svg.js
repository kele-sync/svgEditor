
String.prototype.splice = function (idx, rem, str) {
  return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
};
const app = new Vue({
  el: "#app",
  data() {
    return {
      setting: {
        tools: {
          show: true
        },
        property: {
          show: true
        },
        board: {
          boxShow: true,
          zoom: 1
        }
      },
      board: null,
      elements: null,
      activeElement: null,
      drawComponent: [],
      activeProperty: {
        id: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        stroke: '',
        fill: ""
      },
      jsLibrary: {},
      editor: {
        show: false,
        isInit: false,
        container: null,
        demo: ""
      },
      GuiModel: true,
      demoEditor: null
    }
  },
  mounted() {
    this.initBoard();
  },
  watch: {
    GuiModel(v) {
      if (!v && !this.demoEditor) {
        this.$nextTick(() => {
          this.initDemoEditor();
          v ? this.updateGui() : this.updateEditorValue()
        })
      } else {
        v ? this.updateGui() : this.updateEditorValue()
      }
    }
  },
  methods: {
    updatePreview() {
      const previewFrame = document.getElementById('preview');
      const preview = previewFrame.contentDocument || previewFrame.contentWindow.document;
      preview.open();
      preview.write(this.demoEditor.getValue());
      preview.close();
    },
    drawSvgDemo(demo) {
      const self = this;
      const boardContainer = document.getElementById('board')
      boardContainer.innerHTML = demo;
      const svgElement = boardContainer.getElementsByTagName('svg')[0];
      svgElement.setAttribute('id', 'svgcontainer');
      self.board = SVG.get('svgcontainer').panZoom({ zoomMin: 0.5, zoomMax: 20 });
      self.elements = self.board.set();
      self.board.each(function () {
        self.register(this)
      }, false)
    },
    updateGui() {
      this.setting.tools.show = true;
      this.setting.property.show = true;
      this.drawSvgDemo(this.demoEditor.getValue());
      const boardContainer = document.getElementById('board');
      const svgElement = boardContainer.getElementsByTagName('svg')[0];
      const scripts = svgElement.getElementsByTagName('script');
      for (let index = 0; index < scripts.length; index++) {
        const item = scripts[index];
        if (item.id.endsWith('script')) {
          item.parentNode.removeChild(item);
        }
      }
    },
    createScriptChunk(id, demo) {
      return `
      <script id='${id}-script' type="text/javascript">
      <![CDATA[
         ${demo} 
    	]]>
      </script>`
    },
    getBoardDemo() {
      this.elements.members.forEach(i => {
        try {
          i.selectize(false)
        } catch (error) {
          console.log(error);
        }
      });
      const svgDemo = this.board.svg();
      let scriptDemo = ""
      this.elements.members.map(i => i.id()).forEach(item => {
        if (this.jsLibrary[item]) scriptDemo += this.createScriptChunk(item, this.jsLibrary[item]);
      })
      const svgEndIndex = svgDemo.lastIndexOf("</svg>")
      return svgDemo.splice(svgEndIndex, 0, scriptDemo)
    },
    updateEditorValue() {
      this.setting.tools.show = false;
      this.setting.property.show = false;
      const demo = this.getBoardDemo()
      this.demoEditor.setValue(demo);
      this.demoEditor.autoFormatRange({ line: 0, ch: 0 }, { line: this.demoEditor.lineCount() });
      setTimeout(() => {
        this.demoEditor.refresh();
      }, 0);
    },
    initDemoEditor() {
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
    },
    initBoard() {
      this.board = SVG('board').panZoom({ zoomMin: 0.5, zoomMax: 20 });
      this.elements = this.board.set();
      // this.board.on('click', function (e) {
      //   console.log(e.target); 
      // })
    },
    dragCommonSvg(event, src) {
      event.dataTransfer.setData('src', src)
    },
    dropBoard(event) {
      const src = event.dataTransfer.getData('src');
      const ele = this.board.image(src).size(100, 100).x(event.offsetX).y(event.offsetY);
      this.register(ele)
    },
    register(ele) {
      const self = this;
      this.elements.add(ele);
      ele.draggy()
      this.checked(ele);
      self.updateProperty(ele)
      ele.on("mousedown", function () {
        self.checked(ele);
        self.updateProperty(ele)
      })
      ele.on('dragmove,dragstart,resizing', function () {
        self.board.panZoom(false);
        self.updateProperty(ele)
      })
      ele.on('dragend', function () {
        self.board.panZoom({ zoomMin: 0.5, zoomMax: 20 })
      })
    },
    updateProperty(ele) {
      for (const key in this.activeProperty) {
        this.activeProperty[key] = ele.attr(key)
      }
    },
    setProperty(value, type) {
      this.activeElement.attr(type, value)
    },
    saveEdit() {
      this.$set(this.jsLibrary, this.activeElement.id(), this.editor.container.getValue())
      this.editor.show = false
    },
    editorInit() {
      if (this.editor.isInit) {
        // this.editor.container.setValue(this.jsLibrary[this.activeElement.id()] || '')
      } else {
        this.$nextTick(() => {
          this.editor.container = CodeMirror.fromTextArea(this.$refs.editor, {
            lineNumbers: true,
            matchBrackets: true,
            styleActiveLine: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            lint: {
              esversion: 6
            },
            gutters: ["CodeMirror-lint-markers"],
            mode: { name: "javascript", globalVars: true },
            extraKeys: {
              "Tab": "autocomplete", "F11": function (cm) {
                cm.setOption("fullScreen", !cm.getOption("fullScreen"));
              },
              "Esc": function (cm) {
                if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
              }
            },
            theme: 'midnight'
          });
          this.editor.isInit = true
        })
      }
    },
    editJs() {
      if (this.activeElement) {
        if (this.editor.container) {
          this.editor.container.setValue(this.jsLibrary[this.activeElement.id()] || '');
          setTimeout(() => {
            this.editor.container.refresh();
          }, 0);
        }
        this.editor.show = true;
      } else {
        this.$message.error('请选择需要编辑脚本的模块');
      }
    },
    checked(ele) {
      this.elements.members.forEach(i => {
        try {
          i.selectize(false);
          ele.selectize().resize();
        } catch (error) {
          console.log(error);
        }
      });

      this.activeElement = ele;
    },
    createLine(attr) {
      const line = this.board.polyline().draw({ snapToGrid: 20 }).fill('none').stroke({ width: 2 }).attr(attr);
      line.on('drawstart', () => {
        document.addEventListener('dblclick', (e) => {
          this.register(line)
          line.draw('done');
        });
      });
    },
    triggerImportClick() {
      this.$confirm('导入功能会覆盖当前已绘制画板,请做好保存工作', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$refs.import.click()
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消导入'
        });
      });
    },
    importSvg(e) {
      const self = this;
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = function () {
        self.drawSvgDemo(this.result)
      }
      reader.readAsText(file);
    },
    triggerUploadClick() {
      this.$refs.upload.click()
    },
    uploadComponent(e) {
      const self = this;
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = function (params) {
        self.drawComponent.push(this.result)
      }
      reader.readAsDataURL(file)
    },
    exportSvg() {
      const demo = this.getBoardDemo();
      this.funDownload(demo, 'wx.svg');
    },

    deleteElement() {
      if (this.activeElement) {
        this.elements.remove(this.activeElement)
        console.log(this.elements.members);
        this.activeElement.selectize(false).remove();
        this.activeProperty = {
          id: '',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          stroke: '',
          fill: ""
        }
      } else {
        this.$message('请选择要删除的元素')
      }
    },
    funDownload: function (content, filename) {
      const eleLink = document.createElement("a");
      eleLink.download = filename;
      eleLink.style.display = "none";
      const blob = new Blob([content]);
      eleLink.href = URL.createObjectURL(blob);
      document.body.appendChild(eleLink);
      eleLink.click();
      document.body.removeChild(eleLink);
    },
    setZoom(type) {
      switch (type) {
        case 'add':
          this.setting.board.zoom += 0.1;
          break;
        case 'reduce':
          this.setting.board.zoom -= 0.1
          break;
        case 'reset':
          this.setting.board.zoom = 1
          break;
      }
      this.board.zoom(this.setting.board.zoom, { x: 0, y: 0 })
    },
    clearBoard() {
      this.board.clear()
    },
    setActiveElementIndex(type) {
      if (this.activeElement) {
        this.activeElement[type]()
      } else {
        this.$message('请选择更改的元素');
      }
    }
  },
})

