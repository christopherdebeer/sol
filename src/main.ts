import './styles/main.css'
import { RadialInterface } from './components/RadialInterface'
import { NavigationController } from './components/NavigationController'
import { GestureHandler } from './utils/GestureHandler'
import { GestureEvent } from './types'

class SolApp {
  private radialInterface!: RadialInterface
  private navigationController!: NavigationController
  private gestureHandler!: GestureHandler

  constructor() {
    this.initializeApp()
  }

  private initializeApp(): void {
    const canvas = document.getElementById('radialCanvas')
    const bottomNav = document.querySelector('.bottom-nav')

    if (!canvas || !bottomNav) {
      throw new Error('Required DOM elements not found')
    }

    // Initialize core components
    this.radialInterface = new RadialInterface(canvas as HTMLElement)
    this.navigationController = new NavigationController(bottomNav as HTMLElement)
    this.gestureHandler = new GestureHandler(canvas as HTMLElement)

    // Set up event listeners
    this.setupEventListeners()
    
    // Initialize with default project
    this.loadDefaultProject()

    console.log('Sol Radial Interface initialized')
  }

  private setupEventListeners(): void {
    // Navigation events
    this.navigationController.on('home', () => this.radialInterface.goToRoot())
    this.navigationController.on('add-child', () => this.radialInterface.createChild())
    this.navigationController.on('overview', () => this.radialInterface.showOverview())
    this.navigationController.on('export', () => this.handleExport())

    // Gesture events
    this.gestureHandler.on('tap', (event: GestureEvent) => this.radialInterface.handleTap(event))
    this.gestureHandler.on('doubleTap', (event: GestureEvent) => this.radialInterface.handleDoubleTap(event))
    this.gestureHandler.on('longPress', (event: GestureEvent) => this.radialInterface.handleLongPress(event))
    this.gestureHandler.on('pan', (event: GestureEvent) => this.radialInterface.handlePan(event))
    this.gestureHandler.on('pinch', (event: GestureEvent) => this.radialInterface.handlePinch(event))
    
    // Handle end of gestures
    document.addEventListener('touchend', () => this.radialInterface.handleGestureEnd())
    document.addEventListener('mouseup', () => this.radialInterface.handleGestureEnd())
  }

  private loadDefaultProject(): void {
    // Create tutorial project structure
    const defaultProject = {
      id: 'root',
      text: 'Welcome to Sol',
      children: [
        {
          id: 'tutorial',
          text: 'Tutorial',
          children: [
            { id: 'tap', text: 'Tap to select', children: [] },
            { id: 'double-tap', text: 'Double-tap to edit', children: [] },
            { id: 'long-press', text: 'Long-press for options', children: [] }
          ]
        },
        {
          id: 'features',
          text: 'Features',
          children: [
            { id: 'radial', text: 'Radial Navigation', children: [] },
            { id: 'touch', text: 'Touch Gestures', children: [] },
            { id: 'export', text: 'Export Options', children: [] }
          ]
        }
      ]
    }

    this.radialInterface.loadProject(defaultProject)
  }

  private handlePrint(): void {
    // TODO: Implement print functionality
    console.log('Print requested')
  }

  private handleExport(): void {
    // TODO: Implement export functionality (markdown, mermaid, svg)
    console.log('Export requested')
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SolApp()
})