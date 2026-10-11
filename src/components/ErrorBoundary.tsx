import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; info: ErrorInfo | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info })
    console.error('[KASAJA ErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh', background: '#0f0f0f', color: '#f5f5f5',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '24px', fontFamily: 'system-ui',
        }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid #ef4444',
            borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '100%',
          }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
              App crashed
            </div>
            <div style={{ color: '#f97316', fontSize: '14px', marginBottom: '12px', wordBreak: 'break-all' }}>
              {this.state.error.message}
            </div>
            <pre style={{
              color: '#9ca3af', fontSize: '11px', overflow: 'auto',
              maxHeight: '200px', background: '#0f0f0f', padding: '12px',
              borderRadius: '8px', whiteSpace: 'pre-wrap',
            }}>
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null, info: null })}
              style={{
                marginTop: '16px', background: '#f97316', color: 'white',
                border: 'none', borderRadius: '8px', padding: '10px 20px',
                cursor: 'pointer', fontWeight: 600, fontSize: '14px',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
