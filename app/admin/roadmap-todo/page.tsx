"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface TodoItem {
  id: string
  title: string
  notes?: string | null
  done: boolean
  priority?: number
  created_at?: string
  category?: string | null
  subcategory?: string | null
  due_date?: string | null
  completed_at?: string | null
}

export default function AdminRoadmap() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newSubcategory, setNewSubcategory] = useState("")
  const [newPriority, setNewPriority] = useState<number>(0)
  const [newDueDate, setNewDueDate] = useState<string>("")
  const [filterCategory, setFilterCategory] = useState<string>("")

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const res = await fetch('/api/admin/roadmap')
        const body = await res.json()
        if (!res.ok) throw new Error(body?.error || 'Feil ved lasting')
        if (!mounted) return
        setTodos(body.items || [])
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Fetch roadmap items failed', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  async function addTodo() {
    if (!newText.trim()) return
    try {
      const res = await fetch('/api/admin/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newText, notes: newNotes, priority: newPriority, category: newCategory || null, subcategory: newSubcategory || null, due_date: newDueDate || null }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved opprettelse')
      setTodos((prev) => [body.item, ...(prev || [])])
      setNewText("")
      setNewNotes("")
      setNewCategory("")
      setNewSubcategory("")
      setNewPriority(0)
      setNewDueDate("")
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add roadmap item failed', err)
    }
  }

  async function toggleDone(id: string, done: boolean) {
    try {
      const res = await fetch(`/api/admin/roadmap/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved oppdatering')
      setTodos((prev) => prev.map(t => t.id === id ? body.item : t))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Toggle done failed', err)
    }
  }

  async function removeTodo(id: string) {
    try {
      const res = await fetch(`/api/admin/roadmap/${id}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved sletting')
      setTodos((prev) => prev.filter(t => t.id !== id))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Remove roadmap item failed', err)
    }
  }

  async function editTodo(todo: TodoItem) {
    try {
      const title = window.prompt('Rediger tittel', todo.title) || todo.title
      const notes = window.prompt('Rediger notater', todo.notes || '')
      const category = window.prompt('Kategori', todo.category || '')
      const subcategory = window.prompt('Underkategori', todo.subcategory || '')
      const priorityStr = window.prompt('Prioritet (nummer)', String(todo.priority ?? 0)) || String(todo.priority ?? 0)
      const due_date = window.prompt('Forfallsdato (YYYY-MM-DD)', todo.due_date || '')

      const priority = Number(priorityStr || 0)

      const res = await fetch(`/api/admin/roadmap/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes, category: category || null, subcategory: subcategory || null, priority, due_date: due_date || null })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved oppdatering')
      setTodos((prev) => prev.map(t => t.id === todo.id ? body.item : t))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Edit roadmap item failed', err)
    }
  }

  return (
    <main className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-4">Admin Roadmap & ToDo</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Legg til ny oppgave</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Hva skal gjøres?" value={newText} onChange={e => setNewText(e.target.value)} className="mb-2" />
          <Textarea placeholder="Notater (valgfritt)" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="mb-2" />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input placeholder="Kategori" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
            <Input placeholder="Underkategori" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} />
            <Input type="number" placeholder="Prioritet (høyere først)" value={String(newPriority)} onChange={e => setNewPriority(Number(e.target.value || 0))} />
            <Input type="date" placeholder="Forfallsdato" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={addTodo}>Legg til</Button>
            <Button variant="ghost" onClick={() => { setNewText(''); setNewNotes(''); setNewCategory(''); setNewSubcategory(''); setNewPriority(0); setNewDueDate('') }}>Nullstill</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center gap-2">
        <Input placeholder="Filtrer etter kategori" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laster...</p>
      ) : (
        <div className="space-y-6">
          {/* Group by category */}
          {Object.entries(groupTodos(todos, filterCategory)).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-xl font-semibold mb-2">{category}</h2>
              <div className="space-y-2">
                {items.map(todo => (
                  <Card key={todo.id} className={todo.done ? "opacity-60" : ""}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <Button variant={todo.done ? "secondary" : "outline"} onClick={() => toggleDone(todo.id, !todo.done)} className="mr-2">{todo.done ? "✓" : ""}</Button>
                      <div className="flex-1">
                        <div className="font-medium">{todo.title} {todo.subcategory ? <span className="text-sm text-muted-foreground">· {todo.subcategory}</span> : null}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {todo.notes}
                          {todo.due_date ? <span className="ml-2">Forfall: {todo.due_date}</span> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">P: {todo.priority ?? 0}</div>
                        <Button variant="outline" onClick={() => editTodo(todo)} size="sm">Rediger</Button>
                        <Button variant="destructive" onClick={() => removeTodo(todo.id)} size="sm">Slett</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

function groupTodos(todos: TodoItem[], filterCategory: string) {
  const map: Record<string, TodoItem[]> = {}
  const filtered = todos.filter(t => (filterCategory ? (t.category || 'Uncategorized').toLowerCase().includes(filterCategory.toLowerCase()) : true))
  // Sort by priority desc, then due date asc
  filtered.sort((a, b) => ( (b.priority || 0) - (a.priority || 0) ) || ( (a.due_date || '') > (b.due_date || '') ? 1 : -1 ))
  for (const t of filtered) {
    const key = t.category || 'Uncategorized'
    if (!map[key]) map[key] = []
    map[key].push(t)
  }
  return map
}
