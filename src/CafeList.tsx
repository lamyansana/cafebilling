import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

interface Cafe {
  id: string
  name: string
  location: string
  created_at: string
}

export default function CafeList() {
  const [cafes, setCafes] = useState<Cafe[]>([])

  useEffect(() => {
    const fetchCafes = async () => {
      const { data, error } = await supabase
        .from("cafes")
        .select("*")

      if (error) {
        console.error("Error fetching cafes:", error)
      } else {
        setCafes(data || [])
      }
    }

    fetchCafes()
  }, [])

  return (
    <div>
      <h2>☕ Cafes</h2>
      <ul>
        {cafes.map((cafe) => (
          <li key={cafe.id}>
            {cafe.name} – {cafe.location}
          </li>
        ))}
      </ul>
    </div>
  )
}
