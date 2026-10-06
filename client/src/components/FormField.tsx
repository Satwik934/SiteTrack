import { useState, type InputHTMLAttributes } from 'react'
interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; name: string; hint?: string }

export function FormField({ label, name, hint, type = 'text', ...props }: Props) {
  const [visible, setVisible] = useState(false)
  return <div className="form-field"><label htmlFor={name}>{label}</label>
    <div className="input-wrap"><input {...props} id={name} name={name}
      type={type === 'password' && visible ? 'text' : type} aria-describedby={hint ? `${name}-hint` : undefined} />
      {type === 'password' && <button className="password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button>}
    </div>
    {hint && <p className="field-hint" id={`${name}-hint`}>{hint}</p>}
  </div>
}
