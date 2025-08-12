# Enhanced Message Actions PRD

## Problem Statement

The current message actions implementation in Skate AI has significant usability issues that impact the user experience:

### Current Issues

1. **Hidden Actions**: Copy button and timestamp are only visible on hover (`opacity-0 group-hover/message:opacity-100`), making actions difficult to discover, especially on mobile devices where hover states don't exist
2. **Timestamp Clutter**: Message timestamps are displayed in the action bar but provide limited value to researchers focused on content analysis
3. **Inconsistent Discoverability**: Users must hover over messages to discover available actions, creating a friction point in the chat workflow
4. **Mobile Unfriendly**: Hover-dependent interactions don't translate to touch interfaces

### User Impact

- **Accessibility**: Screen reader users and keyboard navigation users struggle with hover-dependent actions
- **Mobile Experience**: Touch device users cannot access copy functionality easily
- **Workflow Disruption**: Researchers lose focus when hunting for message actions
- **Feature Discovery**: New users may not discover the copy functionality

## User Experience Goals

### Primary Objectives

1. **Always-Visible Actions**: Make copy and other message actions immediately discoverable without requiring hover states
2. **Clean Information Hierarchy**: Remove timestamp clutter to focus on research content
3. **Mobile-First Design**: Ensure message actions work seamlessly on touch devices
4. **Enhanced Discoverability**: Users should immediately understand available actions for each message

### Success Metrics

- **Discoverability**: 95% of new users discover copy functionality within first session
- **Usage**: 40% increase in copy action usage after implementation
- **Mobile Satisfaction**: Touch device users rate message interaction as "easy" (4+ out of 5)
- **Accessibility**: Zero WCAG violations related to message actions

## Design Requirements

### Visual Design

#### Always-Visible Action Buttons
- **Button Style**: Outline variant buttons (consistent with ai-chatbot reference)
- **Positioning**: Below message content, left-aligned with message text
- **Spacing**: 8px gap between action buttons
- **Size**: Compact sizing (`py-1 px-2 h-fit`) for minimal visual impact

#### Button Specifications
```tsx
<Button
  className="py-1 px-2 h-fit text-muted-foreground"
  variant="outline"
  onClick={handleCopy}
>
  <CopyIcon />
</Button>
```

#### Responsive Behavior
- **Desktop**: Full-width action bar with button group
- **Mobile**: Compact button layout optimized for touch targets (minimum 44px)
- **Tablet**: Balanced layout supporting both touch and mouse interactions

### Information Architecture

#### Removed Elements
- **Timestamps**: Remove from message action area to reduce visual clutter
- **Hover Dependencies**: Eliminate all hover-based visibility toggles

#### Enhanced Elements
- **Tooltips**: Add descriptive tooltips for all action buttons
- **Visual Feedback**: Clear button states (idle, hover, active, disabled)
- **Loading States**: Show appropriate feedback during copy operations

### Accessibility Requirements

#### WCAG Compliance
- **Keyboard Navigation**: All actions accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Independence**: Actions distinguishable without color alone

#### Implementation Details
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      aria-label="Copy message content to clipboard"
      className="py-1 px-2 h-fit text-muted-foreground"
      variant="outline"
      onClick={handleCopy}
    >
      <CopyIcon />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Copy message</TooltipContent>
</Tooltip>
```

## Technical Implementation

### Component Architecture Changes

#### New Component: MessageActions
Create a dedicated `MessageActions` component following ai-chatbot's pattern:

```tsx
// /components/chat/MessageActions.tsx
interface MessageActionsProps {
  message: UIMessage;
  onCopy: (text: string) => void;
  isLoading?: boolean;
}

export function MessageActions({ message, onCopy, isLoading }: MessageActionsProps) {
  // Implementation similar to ai-chatbot/components/message-actions.tsx
}
```

#### Modified Component: ProgressiveMessage
Update `ProgressiveMessage.tsx` to use the new `MessageActions` component:

1. **Remove**: Hover-dependent timestamp/copy action bars (lines 69-93, 198-227)
2. **Add**: `<MessageActions>` component after message content
3. **Simplify**: Message rendering logic without inline actions

### Implementation Phases

#### Phase 1: Core Message Actions Component
- Create `MessageActions` component with copy functionality
- Implement tooltip system using existing UI components
- Add proper TypeScript interfaces and props

#### Phase 2: Integration with ProgressiveMessage
- Remove existing hover-dependent action bars
- Integrate `MessageActions` component into message rendering
- Update message layout and spacing

#### Phase 3: Enhanced Copy Functionality  
- Improve copy text extraction from message parts
- Add success/error feedback with toast notifications
- Implement keyboard shortcuts (Ctrl/Cmd+C when message focused)

#### Phase 4: Future Action Extensions
- Design system for additional actions (regenerate, edit, share)
- Prepare component architecture for voting/feedback features
- Add message selection capabilities

### Code Changes Required

#### Files to Modify
1. **`/components/chat/ProgressiveMessage.tsx`**
   - Remove hover-dependent action bars (4 locations)
   - Add `<MessageActions>` component integration
   - Update message layout and spacing

2. **`/components/chat/ChatPanel.tsx`**
   - Simplify `onCopy` handler passing
   - Remove timestamp formatting (if no longer needed elsewhere)

#### Files to Create
1. **`/components/chat/MessageActions.tsx`**
   - New component with copy functionality
   - Tooltip integration
   - Accessibility features
   - Future-ready for additional actions

### Performance Considerations

#### Rendering Optimization
- **Memoization**: Use `memo` for `MessageActions` component to prevent unnecessary re-renders
- **Event Handling**: Optimize copy handlers with `useCallback`
- **Bundle Size**: Minimal impact (new component ~2KB)

#### Memory Impact
- **Component Instances**: Always-rendered actions increase component tree by ~15%
- **Event Listeners**: Optimize click handlers to prevent memory leaks
- **DOM Nodes**: Additional buttons increase DOM size minimally

## User Interaction Patterns

### Primary User Flows

#### Copy Message Content
1. **Discovery**: User sees copy button immediately upon message render
2. **Action**: User clicks copy button (no hover required)
3. **Feedback**: Toast notification confirms successful copy
4. **Usage**: User pastes content in external application

#### Mobile Copy Interaction
1. **Touch Target**: Copy button sized appropriately for touch (44px minimum)
2. **Feedback**: Haptic feedback on supported devices
3. **Accessibility**: VoiceOver/TalkBack announce copy action

### Error Handling
- **Empty Content**: Show error toast if no copyable text exists
- **Clipboard Failure**: Graceful fallback with error message
- **Network Issues**: Disable actions during message streaming

## Future Extensibility

### Planned Action Extensions

#### Research-Focused Actions
1. **Highlight**: Mark important messages for later review
2. **Annotate**: Add private notes to AI responses  
3. **Export**: Save individual messages or conversations
4. **Share**: Generate shareable links for specific insights

#### Collaboration Features
1. **Comment**: Add team comments to messages
2. **Tag**: Categorize messages by research theme
3. **Link**: Connect messages to external research tools

### Technical Architecture
The `MessageActions` component is designed with extensibility in mind:

```tsx
interface MessageActionsProps {
  message: UIMessage;
  onCopy: (text: string) => void;
  onHighlight?: (messageId: string) => void;  // Future
  onAnnotate?: (messageId: string) => void;   // Future  
  onShare?: (messageId: string) => void;      // Future
  isLoading?: boolean;
  disabled?: boolean;
  actions?: ActionType[];  // Configure visible actions
}
```

## Success Measurement

### Key Performance Indicators

#### Usability Metrics
- **Copy Action Discovery**: % of users who use copy within first 3 messages
- **Mobile Copy Usage**: Copy action usage on touch devices vs desktop
- **Action Completion Rate**: Successful copy operations / attempted copies
- **User Satisfaction**: Post-implementation survey on message interaction ease

#### Technical Metrics  
- **Performance Impact**: Message render time with always-visible actions
- **Accessibility Score**: Lighthouse accessibility audit scores
- **Error Rate**: Failed copy operations / total copy attempts
- **Bundle Size**: JavaScript bundle size impact

### Implementation Validation

#### Pre-Launch Testing
1. **Accessibility Audit**: WCAG 2.1 AA compliance verification
2. **Mobile Device Testing**: iOS Safari, Chrome, Android Chrome
3. **Keyboard Navigation**: Full keyboard accessibility testing
4. **Screen Reader Testing**: VoiceOver and NVDA compatibility

#### Post-Launch Monitoring  
1. **Analytics Tracking**: Copy button interaction rates
2. **Error Monitoring**: Copy operation failure rates
3. **Performance Monitoring**: Message render performance impact
4. **User Feedback**: Qualitative feedback on message interaction improvements

## Implementation Timeline

### Sprint 1 (Week 1)
- [ ] Create `MessageActions` component with copy functionality
- [ ] Implement tooltip system integration
- [ ] Add TypeScript interfaces and prop definitions
- [ ] Unit tests for component functionality

### Sprint 2 (Week 2)  
- [ ] Integrate `MessageActions` into `ProgressiveMessage`
- [ ] Remove hover-dependent action bars
- [ ] Update message layout and spacing
- [ ] Integration tests for message rendering

### Sprint 3 (Week 3)
- [ ] Enhanced copy functionality with better text extraction
- [ ] Toast notification integration for copy feedback
- [ ] Mobile responsiveness optimization
- [ ] Cross-browser compatibility testing

### Sprint 4 (Week 4)
- [ ] Accessibility audit and fixes
- [ ] Performance optimization and memoization
- [ ] Documentation and code review
- [ ] Production deployment preparation

---

**Confidence Score for Implementation: 98%**

This PRD addresses a clear usability issue with a well-defined solution pattern based on the ai-chatbot reference implementation. The technical approach is straightforward, leveraging existing UI components and patterns. The main complexity lies in proper accessibility implementation and mobile optimization, both of which are well-understood requirements.

**Risk Factors:**
- Mobile touch target optimization (Low risk - standard design patterns)
- Accessibility compliance (Low risk - using established component patterns)  
- Performance impact of always-visible actions (Very low risk - minimal DOM changes)