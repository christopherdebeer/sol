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
    // Create deep tutorial project structure for testing navigation
    const defaultProject = {
      id: 'root',
      text: 'Welcome to Sol',
      children: [
        {
          id: 'tutorial',
          text: 'Tutorial',
          children: [
            { 
              id: 'basics', 
              text: 'Basics', 
              children: [
                { id: 'tap', text: 'Tap to navigate', children: [
                  { id: 'tap-detail', text: 'Navigate to children', children: [] },
                  { id: 'tap-select', text: 'Select bubbles', children: [] }
                ]},
                { id: 'double-tap', text: 'Double-tap to edit', children: [
                  { id: 'edit-text', text: 'Edit bubble text', children: [] },
                  { id: 'finish-edit', text: 'Press Enter to finish', children: [] }
                ]},
                { id: 'drag', text: 'Drag to rotate', children: [
                  { id: 'momentum', text: 'Momentum physics', children: [] },
                  { id: 'physics', text: 'Natural rotation', children: [] }
                ]}
              ]
            },
            {
              id: 'advanced',
              text: 'Advanced',
              children: [
                { id: 'navigation', text: 'Navigation', children: [
                  { id: 'breadcrumb', text: 'Parent breadcrumb', children: [] },
                  { id: 'deep-nav', text: 'Deep navigation', children: [] }
                ]},
                { id: 'creation', text: 'Creation', children: [
                  { id: 'plus-buttons', text: 'Plus buttons', children: [] },
                  { id: 'add-child', text: 'Add child button', children: [] }
                ]}
              ]
            }
          ]
        },
        {
          id: 'features',
          text: 'Features',
          children: [
            { 
              id: 'interaction', 
              text: 'Interactions', 
              children: [
                { id: 'gestures', text: 'Touch Gestures', children: [
                  { id: 'tap-gesture', text: 'Tap Navigation', children: [] },
                  { id: 'drag-gesture', text: 'Drag Rotation', children: [] },
                  { id: 'edit-gesture', text: 'Edit Mode', children: [] }
                ]},
                { id: 'visual', text: 'Visual Feedback', children: [
                  { id: 'selection', text: 'Selection Highlighting', children: [] },
                  { id: 'transitions', text: 'Smooth Transitions', children: [] }
                ]}
              ]
            },
            { 
              id: 'structure', 
              text: 'Structure', 
              children: [
                { id: 'hierarchy', text: 'Hierarchical Data', children: [
                  { id: 'parent-child', text: 'Parent-Child Links', children: [] },
                  { id: 'unlimited-depth', text: 'Unlimited Depth', children: [] }
                ]},
                { id: 'export', text: 'Export Options', children: [
                  { id: 'markdown', text: 'Markdown Export', children: [] },
                  { id: 'svg', text: 'SVG Export', children: [] }
                ]}
              ]
            }
          ]
        },
        {
          id: 'demo',
          text: 'Demo Project',
          children: [
            {
              id: 'project-planning',
              text: 'Project Planning',
              children: [
                { id: 'requirements', text: 'Requirements', children: [
                  { id: 'functional', text: 'Functional Req', children: [] },
                  { id: 'non-functional', text: 'Non-Functional Req', children: [] }
                ]},
                { id: 'timeline', text: 'Timeline', children: [
                  { id: 'milestones', text: 'Milestones', children: [] },
                  { id: 'deadlines', text: 'Deadlines', children: [] }
                ]}
              ]
            },
            {
              id: 'development',
              text: 'Development',
              children: [
                { id: 'frontend', text: 'Frontend', children: [
                  { id: 'components', text: 'Components', children: [] },
                  { id: 'styling', text: 'Styling', children: [] }
                ]},
                { id: 'backend', text: 'Backend', children: [
                  { id: 'api', text: 'API Design', children: [] },
                  { id: 'database', text: 'Database', children: [] }
                ]}
              ]
            }
          ]
        }
      ]
    }

    this.radialInterface.loadProject(defaultProject)
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