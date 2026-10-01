"use client"

import { useQuery } from "@tanstack/react-query"

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function useList<T>(key: string, url: string, enabled = true) {
  return useQuery<T>({
    queryKey: [key],
    queryFn: () => fetcher<T>(url),
    enabled,
  })
}

export function useOne<T>(key: string, url: string, enabled = true) {
  return useQuery<T>({
    queryKey: [key],
    queryFn: () => fetcher<T>(url),
    enabled,
  })
}

export { fetcher }
