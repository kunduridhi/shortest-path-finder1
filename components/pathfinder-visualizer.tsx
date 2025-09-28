"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Square, RotateCcw, Zap, Target, MapPin } from "lucide-react"

type CellType = "empty" | "wall" | "start" | "end" | "path" | "visited" | "current"

interface Cell {
  row: number
  col: number
  type: CellType
  distance: number
  previous: Cell | null
  isVisited: boolean
}

type PathfinderVisualizerProps = {}

const GRID_ROWS = 25
const GRID_COLS = 50
const ANIMATION_SPEED = 50

export default function PathfinderVisualizer({}: PathfinderVisualizerProps) {
  const [grid, setGrid] = useState<Cell[][]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawMode, setDrawMode] = useState<"wall" | "start" | "end">("wall")
  const [startCell, setStartCell] = useState<{ row: number; col: number } | null>(null)
  const [endCell, setEndCell] = useState<{ row: number; col: number } | null>(null)
  const [pathLength, setPathLength] = useState<number | null>(null)
  const [visitedCount, setVisitedCount] = useState(0)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize grid
  const initializeGrid = useCallback(() => {
    const newGrid: Cell[][] = []
    for (let row = 0; row < GRID_ROWS; row++) {
      const currentRow: Cell[] = []
      for (let col = 0; col < GRID_COLS; col++) {
        currentRow.push({
          row,
          col,
          type: "empty",
          distance: Number.POSITIVE_INFINITY,
          previous: null,
          isVisited: false,
        })
      }
      newGrid.push(currentRow)
    }

    // Set default start and end positions
    const defaultStart = { row: 12, col: 10 }
    const defaultEnd = { row: 12, col: 40 }

    newGrid[defaultStart.row][defaultStart.col].type = "start"
    newGrid[defaultEnd.row][defaultEnd.col].type = "end"

    setStartCell(defaultStart)
    setEndCell(defaultEnd)
    setGrid(newGrid)
    setPathLength(null)
    setVisitedCount(0)
  }, [])

  useEffect(() => {
    initializeGrid()
  }, [initializeGrid])

  // Handle cell click
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (isRunning) return

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => r.map((c) => ({ ...c })))
        const cell = newGrid[row][col]

        if (drawMode === "start") {
          // Clear previous start
          if (startCell) {
            newGrid[startCell.row][startCell.col].type = "empty"
          }
          cell.type = "start"
          setStartCell({ row, col })
        } else if (drawMode === "end") {
          // Clear previous end
          if (endCell) {
            newGrid[endCell.row][endCell.col].type = "empty"
          }
          cell.type = "end"
          setEndCell({ row, col })
        } else if (drawMode === "wall") {
          if (cell.type === "empty") {
            cell.type = "wall"
          } else if (cell.type === "wall") {
            cell.type = "empty"
          }
        }

        return newGrid
      })
    },
    [drawMode, startCell, endCell, isRunning],
  )

  // Handle mouse events for drawing
  const handleMouseDown = useCallback(
    (row: number, col: number) => {
      setIsDrawing(true)
      handleCellClick(row, col)
    },
    [handleCellClick],
  )

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDrawing && drawMode === "wall") {
        handleCellClick(row, col)
      }
    },
    [isDrawing, drawMode, handleCellClick],
  )

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
  }, [])

  // Get neighbors of a cell
  const getNeighbors = useCallback((cell: Cell, grid: Cell[][]) => {
    const neighbors: Cell[] = []
    const { row, col } = cell

    // Up, Right, Down, Left
    const directions = [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ]

    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow
      const newCol = col + dCol

      if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
        neighbors.push(grid[newRow][newCol])
      }
    }

    return neighbors
  }, [])

  // Dijkstra's algorithm
  const dijkstra = useCallback(async () => {
    if (!startCell || !endCell) return

    setIsRunning(true)
    setPathLength(null)
    setVisitedCount(0)

    // Reset grid
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) =>
        row.map((cell) => ({
          ...cell,
          distance: Number.POSITIVE_INFINITY,
          previous: null,
          isVisited: false,
          type: cell.type === "path" || cell.type === "visited" || cell.type === "current" ? "empty" : cell.type,
        })),
      )

      // Set start distance to 0
      newGrid[startCell.row][startCell.col].distance = 0
      return newGrid
    })

    const unvisitedNodes: Cell[] = []

    // Get current grid state
    const currentGrid = grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        distance: cell.row === startCell.row && cell.col === startCell.col ? 0 : Number.POSITIVE_INFINITY,
        previous: null,
        isVisited: false,
        type: cell.type === "path" || cell.type === "visited" || cell.type === "current" ? "empty" : cell.type,
      })),
    )

    // Add all non-wall cells to unvisited
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (currentGrid[row][col].type !== "wall") {
          unvisitedNodes.push(currentGrid[row][col])
        }
      }
    }

    let visitedCounter = 0

    while (unvisitedNodes.length > 0) {
      // Sort by distance and get closest node
      unvisitedNodes.sort((a, b) => a.distance - b.distance)
      const currentNode = unvisitedNodes.shift()!

      // If we hit a wall or infinite distance, we're done
      if (currentNode.distance === Number.POSITIVE_INFINITY) break

      currentNode.isVisited = true
      visitedCounter++

      // Update UI
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) => row.map((cell) => ({ ...cell })))
        if (currentNode.type !== "start" && currentNode.type !== "end") {
          newGrid[currentNode.row][currentNode.col].type = "current"
        }
        return newGrid
      })

      // If we reached the end, reconstruct path
      if (currentNode.row === endCell.row && currentNode.col === endCell.col) {
        const path: Cell[] = []
        let current: Cell | null = currentNode

        while (current !== null) {
          path.unshift(current)
          current = current.previous
        }

        // Animate path
        for (let i = 1; i < path.length - 1; i++) {
          await new Promise((resolve) => {
            animationRef.current = setTimeout(() => {
              setGrid((prevGrid) => {
                const newGrid = prevGrid.map((row) => row.map((cell) => ({ ...cell })))
                newGrid[path[i].row][path[i].col].type = "path"
                return newGrid
              })
              resolve(void 0)
            }, i * 30)
          })
        }

        setPathLength(path.length - 1)
        setVisitedCount(visitedCounter)
        setIsRunning(false)
        return
      }

      // Update neighbors
      const neighbors = getNeighbors(currentNode, currentGrid)

      for (const neighbor of neighbors) {
        if (neighbor.isVisited || neighbor.type === "wall") continue

        const tentativeDistance = currentNode.distance + 1

        if (tentativeDistance < neighbor.distance) {
          neighbor.distance = tentativeDistance
          neighbor.previous = currentNode
        }
      }

      // Mark as visited in UI
      await new Promise((resolve) => {
        animationRef.current = setTimeout(() => {
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((row) => row.map((cell) => ({ ...cell })))
            if (currentNode.type !== "start" && currentNode.type !== "end") {
              newGrid[currentNode.row][currentNode.col].type = "visited"
            }
            return newGrid
          })
          setVisitedCount(visitedCounter)
          resolve(void 0)
        }, ANIMATION_SPEED)
      })
    }

    setIsRunning(false)
  }, [startCell, endCell, grid, getNeighbors])

  // Clear path and visited cells
  const clearPath = useCallback(() => {
    if (isRunning) return

    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) => ({
          ...cell,
          type: cell.type === "path" || cell.type === "visited" || cell.type === "current" ? "empty" : cell.type,
          distance: Number.POSITIVE_INFINITY,
          previous: null,
          isVisited: false,
        })),
      ),
    )
    setPathLength(null)
    setVisitedCount(0)
  }, [isRunning])

  // Reset entire grid
  const resetGrid = useCallback(() => {
    if (isRunning) return
    if (animationRef.current) {
      clearTimeout(animationRef.current)
    }
    initializeGrid()
  }, [isRunning, initializeGrid])

  const getCellClassName = (cell: Cell) => {
    const baseClass = "grid-cell w-4 h-4 cursor-pointer"
    return `${baseClass} grid-cell-${cell.type}`
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-foreground mb-3 text-balance bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
            Shortest Path Finder
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed max-w-2xl mx-auto">
            {
              "Visualize Dijkstra's algorithm as it intelligently explores the grid to find the optimal path between two points"
            }
          </p>
        </div>

        {/* Controls */}
        <Card className="enhanced-card p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={dijkstra}
                disabled={isRunning || !startCell || !endCell}
                className="control-button bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5"
              >
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? "Finding Path..." : "Find Path"}
              </Button>

              <Button
                onClick={clearPath}
                disabled={isRunning}
                variant="outline"
                className="control-button border-border hover:border-primary/50 bg-transparent"
              >
                <Square className="w-4 h-4 mr-2" />
                Clear Path
              </Button>

              <Button
                onClick={resetGrid}
                disabled={isRunning}
                variant="outline"
                className="control-button border-border hover:border-destructive/50 bg-transparent"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Grid
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Draw Mode:</span>
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    size="sm"
                    variant={drawMode === "wall" ? "default" : "ghost"}
                    onClick={() => setDrawMode("wall")}
                    disabled={isRunning}
                    className="control-button h-8"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Wall
                  </Button>
                  <Button
                    size="sm"
                    variant={drawMode === "start" ? "default" : "ghost"}
                    onClick={() => setDrawMode("start")}
                    disabled={isRunning}
                    className="control-button h-8"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant={drawMode === "end" ? "default" : "ghost"}
                    onClick={() => setDrawMode("end")}
                    disabled={isRunning}
                    className="control-button h-8"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    End
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-sm grid-cell-start border border-border"></div>
                <span className="text-sm font-medium text-muted-foreground">Start Point</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-sm grid-cell-end border border-border"></div>
                <span className="text-sm font-medium text-muted-foreground">End Point</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-sm grid-cell-wall border border-border"></div>
                <span className="text-sm font-medium text-muted-foreground">Wall</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-sm grid-cell-path border border-border"></div>
                <span className="text-sm font-medium text-muted-foreground">Shortest Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-sm grid-cell-visited border border-border"></div>
                <span className="text-sm font-medium text-muted-foreground">Explored</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {pathLength !== null && (
                <Badge variant="secondary" className="stats-badge px-3 py-1.5 font-semibold">
                  Path Length: {pathLength}
                </Badge>
              )}

              {visitedCount > 0 && (
                <Badge variant="outline" className="stats-badge px-3 py-1.5 font-semibold">
                  Nodes Explored: {visitedCount}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Grid */}
        <Card className="enhanced-card p-8">
          <div className="flex justify-center">
            <div
              className="grid gap-0 p-4 bg-muted/20 rounded-lg border border-border/50"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={getCellClassName(cell)}
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  />
                )),
              )}
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="enhanced-card p-6 mt-6">
          <h3 className="text-xl font-bold mb-4 text-foreground">How to Use</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground leading-relaxed">
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">1. Set Start & End:</strong> Select "Start" or "End" mode and click
                on the grid to place your points.
              </p>
              <p>
                <strong className="text-foreground">2. Draw Walls:</strong> Select "Wall" mode and click or drag to
                create obstacles and mazes.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">3. Find Path:</strong> Click "Find Path" to watch Dijkstra's
                algorithm explore the grid in real-time.
              </p>
              <p>
                <strong className="text-foreground">4. Experiment:</strong> Try different maze patterns and see how the
                algorithm adapts to find the optimal route!
              </p>
            </div>
          </div>
        </Card>

        {/* Attribution Footer */}
        <div className="text-center mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Made by <span className="font-semibold text-foreground">Ridhi Kundu</span>
          </p>
        </div>
      </div>
    </div>
  )
}
