/**
 * 全选
 * @param refObj
 */
export function selectAll(refObj) {
    const cm = refObj.$refs.codemirrorEditor.codemirror
    if (!cm) return

    const doc = cm.getDoc()
    const lastLine = doc.lastLine()

    doc.setSelection(
        { line: 0, ch: 0 },
        { line: lastLine, ch: doc.getLine(lastLine).length },
        { scroll: true }
    )

    cm.focus()
}

/**
 * 获取焦点（光标会被移动到最末尾的位置）
 * @param refObj
 */
export function focus(refObj) {
    const cm = refObj.$refs.codemirrorEditor.codemirror
    if (!cm) throw new Error('编辑器未初始化')

    const doc = cm.getDoc()
    const lastPos = {
        line: doc.lastLine(),
        ch: doc.getLine(doc.lastLine()).length
    }

    doc.setCursor(lastPos)
    cm.focus()
    cm.scrollIntoView(lastPos, 0)
}

/**
 * 切换主题
 * @param theme
 */
export function changeTheme(refObj, theme) {
    // 获取 CodeMirror 实例
    const cm = refObj.$refs.codemirrorEditor.codemirror
    // 应用新主题
    cm.setOption('theme', theme);
}