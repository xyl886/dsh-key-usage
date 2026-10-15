/** 通用弹窗：口径说明这类「可以写长、但不该占版面」的内容放这里。
 *  Esc / 点遮罩关闭；打开时焦点落到弹窗内，关闭后由浏览器还原到触发按钮。 */
import { useEffect, useRef, type ReactNode } from 'react'
import styles from '../../styles/ui.module.css'

export function Dialog(props: { title: string; children: ReactNode; onClose: () => void }): ReactNode {
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => { if (event.key === 'Escape') props.onClose() }
    document.addEventListener('keydown', onKeyDown)
    boxRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [props.onClose])
  return (
    <div className={styles.dialogMask} onClick={props.onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        tabIndex={-1}
        ref={boxRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHead}>
          <div className={styles.dialogTitle}>{props.title}</div>
          <button type="button" className={styles.dialogClose} aria-label="关闭" onClick={props.onClose}>✕</button>
        </div>
        <div className={styles.dialogBody}>{props.children}</div>
      </div>
    </div>
  )
}