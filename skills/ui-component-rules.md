# skills/ui-component-rules.md

> Rules for building UI components in OriginClipAI. Read before creating or modifying any component.
> Based on competitive analysis of OpusClip, Vizard, Descript, and Castmagic.

---

## The Three Laws of UI Components

### 1. Every Action Gets Feedback

No silent operations. When a user clicks a button, one of these MUST happen within 100ms:
- Button shows loading spinner (if async)
- Toast notification appears (if action completed)
- Confirmation dialog opens (if destructive)
- Inline state change (checkbox toggle, status badge update)

### 2. Every Destructive Action Gets Confirmation

Before deleting, cancelling, or permanently modifying anything:
1. Show a confirmation dialog with clear description of what will happen
2. Red button for the destructive action
3. Gray/outline button for cancel, auto-focused
4. After confirmation: toast with undo option (6 second window)

### 3. Every List Gets an Empty State

Never show a blank page or "0 total" without context. Empty states must include:
- A brief illustration or icon
- Explanatory text: what will appear here and why it's empty
- A primary CTA to fix the empty state
- Optional link to documentation or tutorial

---

## Component Patterns

### Toast Pattern
```typescript
// Usage in any component:
import { useToast } from '@/components/ui/toast';

function MyComponent() {
  const { toast } = useToast();
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  const handleDelete = async (id: string) => {
    await deleteItem(id);
    toast.undo('Item deleted', () => restoreItem(id));
  };
  
  const handleSave = async () => {
    try {
      await save();
      toast.success('Changes saved');
    } catch {
      toast.error('Failed to save. Try again.');
    }
  };
}
```

### Confirmation Pattern
```typescript
import { useConfirm } from '@/components/ui/confirm-dialog';

function MyComponent() {
  const confirm = useConfirm();
  
  const handleDelete = async (job: Job) => {
    const confirmed = await confirm({
      title: 'Delete this job?',
      description: `"${job.title}" and all its clips and text outputs will be permanently removed.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    
    if (!confirmed) return;
    
    await fetch(`/api/v1/jobs/${job.id}`, { method: 'DELETE' });
    toast.undo('Job deleted', () => restoreJob(job.id));
    refresh();
  };
}
```

### Dropdown Menu Pattern
```typescript
// Trigger: three-dot button on any list item
<DropdownMenu>
  <DropdownTrigger>
    <button className="p-1.5 rounded-lg hover:bg-surface-hover">
      <MoreVerticalIcon size={16} />
    </button>
  </DropdownTrigger>
  <DropdownContent align="end">
    <DropdownItem onClick={handleView}>View</DropdownItem>
    <DropdownItem onClick={handleRetry} disabled={job.status !== 'failed'}>
      Retry
    </DropdownItem>
    <DropdownSeparator />
    <DropdownItem onClick={handleDelete} variant="destructive">
      Delete
    </DropdownItem>
  </DropdownContent>
</DropdownMenu>
```

---

## Settings Pattern

Settings inputs must be functional, not just visual. Follow this pattern:

```typescript
// 1. Load current values from profile/API
const [captionStyle, setCaptionStyle] = useState(profile.defaultCaptionStyle);

// 2. onChange triggers immediate save (no "Save" button needed for individual settings)
const handleChange = async (value: string) => {
  setCaptionStyle(value);
  try {
    await fetch('/api/v1/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultCaptionStyle: value }),
    });
    toast.success('Setting saved');
  } catch {
    toast.error('Failed to save setting');
    setCaptionStyle(previousValue); // rollback
  }
};

// 3. Input reflects saved state, not just local state
<select value={captionStyle} onChange={(e) => handleChange(e.target.value)}>
```

---

## Loading States

Every page and data-dependent component needs loading states:

- **Page-level**: Use `loading.tsx` in the route segment. Show a skeleton that matches the page layout.
- **Component-level**: Use `isLoading` from SWR hooks. Show skeleton lines or a spinner.
- **Button-level**: Disable + show spinner when awaiting async action.

Skeleton pattern:
```
┌─────────────────────────────────┐
│  ████████████                   │  ← title skeleton (h-5 w-48 bg-gray-200 rounded animate-pulse)
│  ████████                       │  ← subtitle skeleton (h-3 w-32)
│                                 │
│  ████████████████████████████   │  ← content skeleton (h-4 w-full)
│  ██████████████████             │  ← content skeleton (h-4 w-3/4)
└─────────────────────────────────┘
```

---

## API Response Handling

Every fetch call in a component must handle:
1. **Success**: Update UI + toast
2. **Network error**: Toast with "Network error. Check your connection."
3. **4xx error**: Toast with the error message from the API response
4. **5xx error**: Toast with "Something went wrong. Try again."
5. **Loading state**: Disable the trigger button, show spinner

Pattern:
```typescript
try {
  const res = await fetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  // success handling
  toast.success('Done');
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Something went wrong');
}
```
