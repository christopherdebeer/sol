import { EventEmitter } from '../utils/EventEmitter'

export class NavigationController extends EventEmitter {
  private navElement: HTMLElement

  constructor(navElement: HTMLElement) {
    super()
    this.navElement = navElement
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.navElement.addEventListener('click', (event) => {
      const button = event.target as HTMLElement
      const navBtn = button.closest('.nav-btn') as HTMLElement
      
      if (!navBtn) return
      
      const action = navBtn.dataset.action
      if (!action) return

      // Add visual feedback
      navBtn.style.transform = 'scale(0.95)'
      setTimeout(() => {
        navBtn.style.transform = ''
      }, 150)

      // Emit navigation event
      this.emit(action, { action, element: navBtn })
    })

    // Prevent default touch behaviors on nav buttons
    this.navElement.addEventListener('touchstart', (event) => {
      event.preventDefault()
    })
  }

  setActiveButton(action: string): void {
    // Remove active state from all buttons
    const buttons = this.navElement.querySelectorAll('.nav-btn')
    buttons.forEach(btn => btn.classList.remove('active'))

    // Set active state on specified button
    const activeBtn = this.navElement.querySelector(`[data-action="${action}"]`)
    if (activeBtn) {
      activeBtn.classList.add('active')
    }
  }

  updateButtonState(action: string, enabled: boolean): void {
    const button = this.navElement.querySelector(`[data-action="${action}"]`) as HTMLButtonElement
    if (button) {
      button.disabled = !enabled
      button.style.opacity = enabled ? '1' : '0.5'
    }
  }
}