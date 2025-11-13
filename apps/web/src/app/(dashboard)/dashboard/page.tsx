'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CheckCircle2,
  Circle,
  Search,
  Sparkles,
  RefreshCw,
  Plus,
  Clock,
  AlertCircle
} from 'lucide-react'

/**
 * Dashboard Page - MVP Features
 *
 * Main "daily cockpit" for agents with:
 * 1. Action Center (AI-prioritized task list)
 * 2. Talk to Kairo command bar (natural language → actions)
 * 3. Agent Notepad → auto-tasks/reminders
 * 4. Real-time sync indicator
 */

interface Task {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  dueTime?: string
}

export default function DashboardPage() {
  // State for sync indicator
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime] = useState(new Date())

  // State for Action Center tasks (placeholder data)
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Follow up with John Smith about property viewing',
      priority: 'high',
      completed: false,
      dueTime: '10:00 AM',
    },
    {
      id: '2',
      title: 'Prepare CMA for 123 Main Street',
      priority: 'high',
      completed: false,
      dueTime: '2:00 PM',
    },
    {
      id: '3',
      title: 'Send contract to buyer for review',
      priority: 'medium',
      completed: false,
      dueTime: '4:00 PM',
    },
    {
      id: '4',
      title: 'Update MLS listing photos',
      priority: 'low',
      completed: false,
    },
  ])

  // State for notepad
  const [notepadContent, setNotepadContent] = useState('')

  // State for command bar
  const [commandInput, setCommandInput] = useState('')

  // Handlers
  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ))
  }

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement AI command processing in later phase
    console.log('Command submitted:', commandInput)
    setCommandInput('')
    alert('Command processing will be implemented in the next phase')
  }

  const handleExtractTasks = () => {
    // TODO: Implement AI task extraction in later phase
    alert('AI task extraction will be implemented in the next phase')
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'low':
        return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getPriorityBgColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
      case 'low':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your daily command center
          </p>
        </div>

        {/* Real-time sync indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span>
                Last synced: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Talk to Kairo Command Bar */}
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black dark:text-white">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Talk to Kairo
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Use natural language to create tasks, find contacts, or schedule activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCommandSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-600" />
              <Input
                placeholder='Try: "Schedule a call with John tomorrow at 2pm" or "Show me all pending deals"'
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                className="pl-10 bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Ask
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Action Center */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black dark:text-white">
                  Action Center
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  AI-prioritized tasks for today
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks for today. You're all caught up!</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border transition-all ${
                      task.completed
                        ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
                        : getPriorityBgColor(task.priority)
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="mt-1 focus:outline-none"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Circle className={`h-5 w-5 ${getPriorityColor(task.priority)}`} />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          task.completed
                            ? 'line-through text-gray-500 dark:text-gray-400'
                            : 'text-black dark:text-white'
                        }`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs font-medium uppercase ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.dueTime && (
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.dueTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agent Notepad */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black dark:text-white">
                  Agent Notepad
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Jot down notes - AI will extract tasks and reminders
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtractTasks}
                className="border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Tasks
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Start typing your notes here...&#10;&#10;Example:&#10;- Call Sarah about the Main St property tomorrow&#10;- Need to prepare documents for closing on Friday&#10;- Follow up with lender about pre-approval"
              value={notepadContent}
              onChange={(e) => setNotepadContent(e.target.value)}
              className="min-h-[300px] bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <p>
                {notepadContent.length} characters
              </p>
              <p className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI task extraction available
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Tasks Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black dark:text-white">
              {tasks.filter(t => t.completed).length} / {tasks.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {tasks.filter(t => t.priority === 'high' && !t.completed).length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black dark:text-white">
              0
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Coming in Phase 2
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black dark:text-white">
              0
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Coming in Phase 2
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
