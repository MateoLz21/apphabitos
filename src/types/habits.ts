export type TrackingType = 'boolean' | 'quantitative'

export type Habit = {
  id: string
  name: string
  description: string | null
  tracking_type: TrackingType
  unit: string | null
  target_value: number | null
  color: string
  icon: string | null
  sort_order: number
}

export type HabitEntry = {
  habit_id: string
  completed: boolean
  numeric_value: number | null
}

export type HabitWithEntry = Habit & { entry?: HabitEntry }
