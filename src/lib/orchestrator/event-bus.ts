import { OrchestratorEvent, OrchestratorEventType } from './types'

type Listener<TType extends OrchestratorEventType = OrchestratorEventType> = (
  event: OrchestratorEvent<TType>
) => void

type ListenerMap = Map<OrchestratorEventType | '*', Set<Listener>>

export class OrchestratorEventBus {
  private listeners: ListenerMap = new Map()

  subscribe<TType extends OrchestratorEventType>(
    type: TType,
    listener: Listener<TType>
  ): () => void
  subscribe(type: '*', listener: Listener): () => void
  subscribe(
    type: OrchestratorEventType | '*',
    listener: Listener
  ): () => void {
    const existing = this.listeners.get(type) ?? new Set<Listener>()
    existing.add(listener)
    this.listeners.set(type, existing)

    return () => {
      const listeners = this.listeners.get(type)
      if (!listeners) return
      listeners.delete(listener)
      if (!listeners.size) {
        this.listeners.delete(type)
      }
    }
  }

  emit<TType extends OrchestratorEventType>(event: OrchestratorEvent<TType>): void {
    const listenersForType = this.listeners.get(event.type)
    const listenersForAll = this.listeners.get('*')

    if (listenersForType) {
      for (const listener of listenersForType) {
        listener(event)
      }
    }

    if (listenersForAll) {
      for (const listener of listenersForAll) {
        listener(event)
      }
    }
  }

  once<TType extends OrchestratorEventType>(
    type: TType,
    listener: Listener<TType>
  ): () => void {
    const unsubscribe = this.subscribe(type, (event) => {
      unsubscribe()
      listener(event)
    })

    return unsubscribe
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const orchestratorEventBus = new OrchestratorEventBus()
