# AI Pronunciation Tutor Game - Design Guidelines

## Design Approach: Child-Focused Educational Gaming

**Selected Approach**: Reference-based design inspired by Duolingo's gamification, Khan Academy Kids' child-friendly interface, and PBS Kids' engaging visual language. This educational voice game requires an encouraging, playful aesthetic that maintains children's attention while providing clear feedback.

**Core Principles**:
- Playful Learning: Every interaction feels like play, not work
- Clear Feedback: Visual states are immediately understandable by young children
- Confidence Building: Design celebrates progress and encourages retry
- Distraction-Free: Focus maintained on the speaking/listening activity

---

## Color Palette

### Primary Colors
**Light Mode** (Default):
- Primary: 220 85% 55% (Bright, friendly blue)
- Primary Hover: 220 85% 48%
- Success: 145 70% 50% (Encouraging green)
- Accent: 280 75% 60% (Playful purple for celebrations)

**Dark Mode**:
- Primary: 220 80% 65%
- Primary Hover: 220 80% 58%
- Success: 145 65% 55%
- Accent: 280 70% 65%

### Semantic Colors
- Correct Answer: 145 70% 50% (Green with confetti animation)
- Incorrect/Retry: 25 85% 60% (Warm orange, not harsh red)
- AI Speaking: 200 75% 55% (Calm blue indicator)
- Listening Active: 145 70% 50% (Active green for mic)
- Processing: 280 75% 60% (Purple pulse animation)

### Background & Surface
- Light Background: 210 20% 98%
- Light Surface: 0 0% 100%
- Dark Background: 220 25% 12%
- Dark Surface: 220 20% 16%

---

## Typography

**Font Families**:
- Primary: 'Fredoka', 'Nunito', sans-serif (rounded, friendly)
- Accent/Display: 'Bubblegum Sans', 'Comic Neue', cursive (for word display)

**Type Scale**:
- Display (Target Word): text-6xl to text-8xl, font-bold
- Heading (Feedback): text-2xl to text-4xl, font-semibold
- Body (Instructions): text-lg to text-xl, font-medium
- Small (Points/Status): text-base to text-lg, font-medium

**Implementation**: Google Fonts CDN for Fredoka and Bubblegum Sans

---

## Layout System

**Spacing Primitives**: Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16, 20, 24
- Compact spacing: p-4, gap-2 (status indicators, attempt dots)
- Standard spacing: p-6 to p-8, gap-4 (cards, containers)
- Generous spacing: p-12 to p-20, gap-8 (main game area, sections)

**Container Strategy**:
- Game Container: max-w-4xl mx-auto (centered focus area)
- Full-width header/footer with inner max-w-6xl
- Responsive padding: px-4 on mobile, px-8 on desktop

**Grid Usage**:
- Single column focus for game area (no distractions)
- Two-column layout for pronunciation tips (visual + text)
- Three-column for attempt indicators (heart/dot display)

---

## Component Library

### A. Game Interface Components

**Main Word Display Card**:
- Large rounded container (rounded-3xl) with soft shadow
- Target word in display font at text-7xl to text-9xl
- Subtle gradient background (from primary-50 to accent-50)
- Phonetic pronunciation below in text-2xl with lighter weight
- Animated entrance (scale + fade) when new word appears

**Microphone Visualizer**:
- Circular design (w-32 h-32) with pulsing ring animations
- Three states: Idle (gray), Listening (green pulse), Processing (purple spin)
- Audio wave visualization inside circle when active
- "Tap to speak" or "Listening..." text below

**AI Avatar/Status Indicator**:
- Friendly character illustration or animated icon
- Speech bubble for AI feedback with tail pointing to avatar
- Color-coded states: Speaking (blue glow), Thinking (purple pulse), Quiet (gray)
- Gentle bounce animation when AI starts speaking

**Attempt Counter**:
- Heart or star icons showing 3 attempts (filled/outlined)
- Positioned top-right of game area
- Lose one with shake animation on incorrect attempt
- Refill all with celebration on new word

### B. Feedback & Progress Components

**Points Display**:
- Large badge in top-left (rounded-full with shadow)
- Animated number increment (+10) when points earned
- Star or trophy icon with point value
- Gold gradient background for achievement feel

**Progress Bar**:
- Full-width at top or bottom of game area
- Segmented design showing total words (15-20 segments)
- Filled segments in success green, current in primary
- Text overlay: "Word 3 of 15"

**Feedback Toast/Modal**:
- Large, centered card for AI feedback
- Animated character expression (happy/encouraging/celebrating)
- Feedback text in large, readable font
- Action button: "Try Again" or "Next Word"
- Auto-dismiss or manual close

### C. Pronunciation Guidance

**Visual Mouth Diagram**:
- Illustrated side-view of mouth/tongue position
- Highlight specific articulators for current phoneme
- Labeled with simple terms ("Tongue up", "Open wide")
- Positioned beside target word during introduction

**Sound Breakdown Card**:
- Syllable separation of target word (ST-AR)
- Each syllable with pronunciation hint
- Color-coded phoneme types (consonant/vowel)
- Animated reveal as AI explains

### D. Navigation & Controls

**Top Header Bar**:
- Child's name with friendly greeting
- Settings icon (volume, speed, help)
- Exit game button with confirmation
- Sticky positioned during scroll

**Bottom Control Tray**:
- Microphone button (primary, large, centered)
- Skip word button (secondary, only after 2 attempts)
- Replay AI instruction button
- Background: translucent blur (backdrop-blur-lg)

### E. Celebration Elements

**Success Animation**:
- Confetti burst from center (using canvas-confetti library)
- Checkmark icon with scale-bounce animation
- "+10 points" floating up with fade out
- Sound effect trigger point

**Attempt Feedback**:
- Incorrect: Gentle horizontal shake (not harsh red X)
- Partial: Yellow glow with encouraging emoji
- Perfect: Green explosion with star particles

---

## Interaction & Animation Guidelines

**Animation Principles**:
- Playful but not distracting (duration: 200-400ms)
- Use ease-out for appearing elements
- Use ease-in-out for state changes
- Spring animations for success celebrations

**Key Animations**:
1. Word transition: Current word scale-out + fade, new word scale-in + fade (500ms)
2. Microphone pulse: Continuous scale 1.0 to 1.15 while listening (1s ease-in-out loop)
3. AI speaking indicator: Gentle wave or bounce (800ms ease-in-out loop)
4. Points increment: Number count-up with scale bounce (600ms)
5. Confetti: Burst from center on success (1.5s duration)

**Minimal Use**:
- No background animations or moving patterns
- No auto-playing decorative animations
- Focus animations only on state changes and feedback

---

## Visual States

**Microphone States**:
- Inactive: Gray outline circle, "Tap to start" text
- Active Listening: Green filled circle, pulsing rings, "Listening..." text
- Processing: Purple circle, spinning loader, "Thinking..." text
- AI Speaking: Blue circle with muted icon, "AI is talking" text

**Game States**:
- Loading: Centered spinner with "Getting your words ready..."
- Word Introduction: AI avatar animated, word card visible, mic disabled
- Awaiting Response: Mic active/pulsing, attempt counter visible, tip visible
- Evaluating: Processing spinner, mic disabled, "Checking your pronunciation..."
- Feedback: Large modal with AI feedback, action buttons enabled
- Game Complete: Summary card with total points, words mastered, celebration

---

## Accessibility & Child-Friendly Considerations

**Visual Clarity**:
- Minimum touch target: 48px × 48px for all buttons
- High contrast ratios (WCAG AAA for text)
- No critical information in color alone
- Icons paired with text labels

**Readability**:
- Line height: 1.6 for body text
- Letter spacing: Slightly increased for display text
- Text never over complex backgrounds without backdrop blur

**Dark Mode**:
- Softer colors, reduced contrast for eye comfort
- Maintain all visual hierarchy and state indicators
- Slightly reduced saturation on accent colors

---

## Images

**Hero/Welcome Screen** (if implemented):
- Illustration of friendly AI character mascot
- Child-friendly scene: classroom, space, or nature theme
- Position: Full-width background with content overlay
- Style: Flat illustration with bright, inviting colors

**In-Game Graphics**:
- Mouth/tongue position diagrams (SVG illustrations)
- AI avatar character (animated SVG or Lottie)
- Success/celebration graphics (stars, confetti, trophies)
- Achievement badges (milestone icons)

**No images needed for**: Microphone visualizer (CSS/Canvas), progress bars, buttons, or text areas

---

## Responsive Behavior

**Mobile (< 768px)**:
- Single column layout, full-width cards
- Larger touch targets (min 56px)
- Microphone button: Fixed bottom-center (safe area aware)
- Reduced text sizes (text-5xl for target word)

**Tablet (768px - 1024px)**:
- Two-column for pronunciation tips
- Standard spacing and sizing
- Optimized for portrait orientation

**Desktop (> 1024px)**:
- Centered game area with max-w-4xl
- Side panels for tips and progress
- Larger text and visual elements for classroom display

---

This design system creates an encouraging, child-focused learning environment where every visual element supports clear communication and positive reinforcement. The playful aesthetic maintains engagement while the structured layout ensures children can focus on the core activity: practicing pronunciation through natural voice interaction.