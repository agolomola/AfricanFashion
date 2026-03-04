## Problem

The Vercel build fails with:

```
apps/web/src/pages/Designs.tsx:728:10: ERROR: Unterminated regular expression
```

## Root Cause

There was an extra `</div>` on line 705 with no matching opening tag. This broke the JSX tree structure, causing esbuild to misparse the remainder of the file and report 'Unterminated regular expression' at line 728.

### Before (broken nesting):
```
L581: <div>     ← Main Content (OPEN)
L588:   <div>   ← Products Grid (OPEN)
L704:   </div>  ← Products Grid (CLOSE) ✅
L705: </div>    ← ❌ EXTRA - no matching open!
L707-726:       ← Mobile Filter Drawer (orphaned)
L727: </div>    ← was supposed to close Main Content
L728: </div>    ← was supposed to close outermost
```

### After (fixed nesting):
```
L581: <div>     ← Main Content (OPEN)
L588:   <div>   ← Products Grid (OPEN)
L704:   </div>  ← Products Grid (CLOSE) ✅
              ← (line 705 REMOVED)
L707-726:       ← Mobile Filter Drawer (inside Main Content) ✅
L727: </div>    ← Main Content (CLOSE) ✅
L728: </div>    ← Outermost (CLOSE) ✅
```

## Changes
- Removed the extra `</div>` that was on line 705
- Removed unused imports: `Filter`, `Grid3X3`, `List` from lucide-react
- Bumped cache bust to v9104

## Testing
After this fix, the JSX div nesting is balanced and the Vite/esbuild build should complete successfully.