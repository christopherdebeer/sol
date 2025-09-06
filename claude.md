# Sol - Radial Mind Mapping Interface

## Interface Vision

Sol is a Mindly-style radial mind mapping application that transforms traditional hierarchical thinking into an immersive, spatial experience. The interface is built around organic bubble navigation rather than rigid linear structures.

### Core Metaphor: Solar System Navigation
- **Central Sun Bubble**: The main idea or project root that anchors all content
- **Orbital Children**: Ideas that radiate outward in concentric rings
- **Spatial Navigation**: Users move through ideas by zooming, rotating, and panning
- **Organic Growth**: Structure emerges naturally from spatial relationships

### Navigation Principles
1. **Tap to Focus**: Tapping a bubble brings it to center stage, with others moving to periphery
2. **Double-tap to Edit**: Direct inline editing with minimal friction
3. **Long-press for Context**: Rich interaction menus for advanced operations
4. **Gesture-driven Flow**: Pan, pinch, rotate for natural spatial navigation
5. **Zoom Levels**: Seamless transition between detail view and overview

### Visual Design Language
- **Gradient Backgrounds**: Deep space aesthetic with subtle color transitions
- **Soft Bubble Shadows**: Creates depth and hierarchy without harsh edges
- **Consistent Sizing**: Clear visual hierarchy through bubble size relationships
- **Color Psychology**: Warm central nodes, cooler periphery for visual balance
- **Minimal UI Chrome**: Interface elements fade into background during use

## Development Guidelines

### Component Architecture

#### Small & Composable Components
```typescript
// ✅ Good: Single responsibility
class BubbleNode {
  render(): HTMLElement
  handleEdit(): void
  updatePosition(x: number, y: number): void
}

// ❌ Bad: Multiple responsibilities  
class BubbleNodeWithNavigationAndExport {
  // Too many concerns in one component
}
```

#### Reusable Building Blocks
- **Bubble Components**: Core visual elements with consistent interfaces
- **Gesture Handlers**: Touch/mouse interaction patterns
- **Layout Engines**: Positioning algorithms as standalone modules
- **Animation Controllers**: Smooth transitions and physics-based movement

### Mobile-First Touch Interface

#### Touch Targets & Accessibility
- Minimum 44px touch targets for finger-friendly interaction
- Clear visual feedback for all interactions
- Support for both single-finger and multi-touch gestures
- Graceful degradation for mouse/keyboard users

#### Performance Considerations
- Passive event listeners where possible
- Hardware-accelerated CSS transforms
- Efficient DOM manipulation with minimal reflows
- Touch event throttling for smooth performance

#### Gesture System
```typescript
interface GestureEvent {
  type: 'tap' | 'doubleTap' | 'longPress' | 'pan' | 'pinch'
  position: { x: number; y: number }
  target: HTMLElement
  // Additional gesture-specific properties
}
```

### Code Organization

#### Folder Structure
```
src/
├── components/          # Reusable UI components
│   ├── RadialInterface.ts   # Main canvas controller
│   ├── BubbleNode.ts        # Individual bubble logic
│   ├── NavigationController.ts  # Bottom nav handler
│   └── ContextMenu.ts       # Right-click/long-press menus
├── utils/              # Utility functions & helpers
│   ├── GestureHandler.ts    # Touch/mouse gesture processing
│   ├── LayoutEngine.ts      # Positioning algorithms
│   ├── AnimationController.ts   # Smooth transitions
│   └── ExportManager.ts     # Markdown/SVG/Mermaid export
├── types/              # TypeScript type definitions
│   └── index.ts            # Core interfaces & types
└── styles/             # CSS modules & design tokens
    ├── main.css            # Global styles & CSS variables
    ├── components.css      # Component-specific styles
    └── animations.css      # Transition & animation styles
```

#### Module Boundaries
- **Components**: Handle presentation and user interaction
- **Utils**: Pure functions for data transformation and algorithms  
- **Types**: Shared interfaces and type definitions
- **Styles**: Visual design language and responsive behavior

### TypeScript Best Practices

#### Strict Type Safety
```typescript
// ✅ Explicit interfaces
interface BubbleNode {
  id: string
  text: string
  children: BubbleNode[]
  position?: { x: number; y: number }
}

// ✅ Generic event system
class EventEmitter<T> {
  on(event: string, callback: (data: T) => void): void
}
```

#### Modular Design
- Small, focused modules with clear responsibilities
- Dependency injection for testability
- Immutable data structures where possible
- Pure functions for business logic

### Export & Integration

#### Multi-format Export Support
- **Markdown**: Clean text format with hierarchy preserved
- **Mermaid**: Diagrams as code for technical documentation
- **SVG**: Vector graphics for high-quality printing
- **JSON**: Raw data format for backup and migration

#### GitHub Pages Deployment
- Automatic builds on push to main branch
- Static asset optimization for fast loading
- Progressive Web App features for offline usage
- Cross-browser compatibility testing

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Code quality checks
npm run type-check # TypeScript validation
```

## Testing Strategy

Focus on:
1. **Gesture Recognition**: Touch event handling across devices
2. **Layout Algorithms**: Bubble positioning and collision detection  
3. **Export Functions**: Data integrity across format conversions
4. **Performance**: Smooth 60fps animations on mobile devices
5. **Accessibility**: Keyboard navigation and screen reader support
