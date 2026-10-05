"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Inbox } from "lucide-react"

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  loading?: boolean
  search?: boolean
  searchText?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  toolbar?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  footer?: React.ReactNode
  className?: string
  /** Optional class override for the header <TableRow>. Default: "bg-muted/40 hover:bg-muted/40". */
  headerRowClassName?: string
  /** Optional content rendered to the LEFT of the search input (e.g. a section label or action button). */
  searchLeftAddon?: React.ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  search = true,
  searchText,
  searchPlaceholder = "Search...",
  onSearchChange,
  toolbar,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or add a new record.",
  footer,
  className,
  headerRowClassName,
  searchLeftAddon,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = React.useState("")
  const isControlled = searchText !== undefined && onSearchChange !== undefined
  const searchValue = isControlled ? (searchText as string) : internalSearch

  const handleSearch = (val: string) => {
    if (isControlled) {
      onSearchChange!(val)
    } else {
      setInternalSearch(val)
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(search || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-1">
            {searchLeftAddon}
            {search ? (
              <div className="relative w-full sm:max-w-xs">
                <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-8"
                />
              </div>
            ) : (
              <div />
            )}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className={headerRowClassName ?? "bg-muted/40 hover:bg-muted/40"}>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
                      <Inbox className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium">{emptyTitle}</div>
                    <div className="text-muted-foreground text-xs">{emptyDescription}</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={rowKey(row, idx)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {footer && <div className="text-muted-foreground text-xs">{footer}</div>}
    </div>
  )
}
