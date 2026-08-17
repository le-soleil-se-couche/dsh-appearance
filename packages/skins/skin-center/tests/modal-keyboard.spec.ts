// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { handleNestedDialogKeyDown } from '../src/client/modal-keyboard.ts'

function dialogFixture(): {
  dialog: HTMLElement
  close: HTMLButtonElement
  input: HTMLInputElement
  cancel: HTMLButtonElement
  submit: HTMLButtonElement
} {
  const dialog = document.createElement('div')
  const close = document.createElement('button')
  const input = document.createElement('input')
  const cancel = document.createElement('button')
  const submit = document.createElement('button')
  dialog.append(close, input, cancel, submit)
  document.body.append(dialog)
  return { dialog, close, input, cancel, submit }
}

describe('nested import dialog keyboard containment', () => {
  it('consumes Escape before the host Settings dialog can close', () => {
    const { dialog } = dialogFixture()
    const onClose = vi.fn()
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation')

    handleNestedDialogKeyDown(event, dialog, onClose)

    expect(event.defaultPrevented).toBe(true)
    expect(stopImmediatePropagation).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cycles Tab and Shift+Tab at the dialog boundaries', () => {
    const { dialog, close, submit } = dialogFixture()
    const onClose = vi.fn()

    submit.focus()
    const forward = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    handleNestedDialogKeyDown(forward, dialog, onClose)
    expect(forward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)

    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
    handleNestedDialogKeyDown(backward, dialog, onClose)
    expect(backward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(submit)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('leaves ordinary keys and interior Tab movement to the browser', () => {
    const { dialog, input } = dialogFixture()
    const onClose = vi.fn()
    input.focus()

    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    const character = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
    handleNestedDialogKeyDown(tab, dialog, onClose)
    handleNestedDialogKeyDown(character, dialog, onClose)

    expect(tab.defaultPrevented).toBe(false)
    expect(character.defaultPrevented).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
  })
})
