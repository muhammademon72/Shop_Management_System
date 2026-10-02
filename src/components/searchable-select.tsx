"use client"

import * as React from "react"
import { Check, ChevronsUpDown, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
  value: string
  label: string
  hint?: string
}

interface SearchableSelectProps {
  value: string | null
  onValueChange: (value: string | null) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  triggerClassName?: string
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
  compact?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  triggerClassName,
  allowNone = false,
  noneLabel = "— None —",
  disabled = false,
  compact = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedLabel = React.useMemo(() => {
    if (!value) return null
    return options.find((o) => o.value === value)?.label ?? null
  }, [value, options])

  const handleSelect = (val: string | null) => {
    onValueChange(val)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            compact ? "h-8 px-2 text-xs" : "h-9 px-3",
            !selectedLabel && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", className)}
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={true}>
          <div className="flex h-9 items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 shrink-0 opacity-50" />
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
              className="h-9 flex-1 border-0 bg-transparent px-0 py-0 text-sm outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {allowNone && (
              <CommandGroup>
                <CommandItem
                  value={`__none__ ${noneLabel}`}
                  onSelect={() => handleSelect(null)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {noneLabel}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((opt) => {
                const searchValue = opt.hint
                  ? `${opt.label} ${opt.hint}`
                  : opt.label
                return (
                  <CommandItem
                    key={opt.value}
                    value={searchValue}
                    onSelect={() => handleSelect(opt.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                    {opt.hint && (
                      <span className="ml-auto pl-2 text-xs text-muted-foreground">
                        {opt.hint}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
