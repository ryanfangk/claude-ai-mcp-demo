'use client'

import React, { useActionState } from 'react'
import { BRAND, STYLES } from '@/lib/brand'

// Thin client wrapper for Server-Action-backed forms. Pulls the
// `useActionState` hook out of every auth/profile page so the route files
// stay declarative React Server Components.
//
// The hook gives us:
//   - `state` — the most recent return from the Server Action (an
//     { error?, notice? } object)
//   - `formAction` — a function to wire into <form action={...}>
//   - `pending` — true while the action is in flight
//
// The action prop is typed loosely because every Server Action that uses
// useActionState has a slightly different signature, and TS can't always
// infer it across the use-client boundary.

type ActionState = { error?: string; notice?: string } | undefined

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  submitLabel: string
  initialNotice?: string
  children: React.ReactNode
}

export default function AuthForm({ action, submitLabel, initialNotice, children }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    initialNotice ? { notice: initialNotice } : undefined,
  )

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {state?.error ? <div style={STYLES.errorBox}>{state.error}</div> : null}
      {state?.notice ? <div style={STYLES.noticeBox}>{state.notice}</div> : null}
      {children}
      <button
        type="submit"
        disabled={pending}
        style={{
          ...STYLES.primaryButton,
          opacity: pending ? 0.6 : 1,
          cursor: pending ? 'wait' : 'pointer',
          marginTop: '0.5rem',
        }}
      >
        {pending ? 'Working…' : submitLabel}
      </button>
    </form>
  )
}

// Reusable field block — label + input + optional helper text.
export function Field({
  label,
  name,
  type = 'text',
  required = false,
  defaultValue,
  placeholder,
  autoComplete,
  helper,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  placeholder?: string
  autoComplete?: string
  helper?: string
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={STYLES.label}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={STYLES.input}
      />
      {helper ? (
        <span style={{ display: 'block', fontSize: '0.75rem', color: BRAND.mute, marginTop: '0.3rem' }}>
          {helper}
        </span>
      ) : null}
    </label>
  )
}
