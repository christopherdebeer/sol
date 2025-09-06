// Core data structures for the Sol radial interface

export interface BubbleNode {
  id: string
  text: string
  children: BubbleNode[]
  color?: string
  icon?: string
  attachments?: Attachment[]
  position?: Position
  metadata?: Record<string, any>
}

export interface Position {
  x: number
  y: number
  angle?: number
  radius?: number
}

export interface Attachment {
  type: 'image' | 'link' | 'note' | 'file'
  url?: string
  content?: string
  title?: string
}

export interface GestureEvent {
  type: 'tap' | 'doubleTap' | 'longPress' | 'pan' | 'pinch' | 'rotate'
  target: HTMLElement
  position: Position
  deltaX?: number
  deltaY?: number
  scale?: number
  rotation?: number
  touches?: Touch[]
  originalEvent: Event
}

export interface RadialLayout {
  center: Position
  radius: number
  bubbles: PositionedBubble[]
}

export interface PositionedBubble extends BubbleNode {
  position: Position
  element: HTMLElement
  level: number
  isVisible: boolean
}

export interface ExportOptions {
  format: 'markdown' | 'mermaid' | 'svg' | 'json'
  includeAttachments: boolean
  includeColors: boolean
}

export interface ViewState {
  centerNode: string
  zoom: number
  rotation: number
  pan: Position
}

// Event system types
export type EventCallback<T = any> = (data: T) => void

export interface EventEmitter {
  on<T>(event: string, callback: EventCallback<T>): void
  off<T>(event: string, callback: EventCallback<T>): void
  emit<T>(event: string, data?: T): void
}