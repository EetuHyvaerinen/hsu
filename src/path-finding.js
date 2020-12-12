/**
 * PathFinding.
 * Module for path finding function
 */
export const PathFinding = {
  /**
   * aStar.
   * A* Path Finding
   */
  aStar({ graph, start, finish }) {
    const startPlace = graph.find((t) => PathFinding.inArea(t, start));
    const finishPlace = graph.find((t) => PathFinding.inArea(t, finish));
    if (!finishPlace) {
      return [];
    }
    const nextPlaces = [];
    const been = [];
    let place = startPlace;
    while (place && (place.x !== finishPlace.x || place.y !== finishPlace.y)) {
      for (let i = 0; i < place.neighbors.length; i++) {
        const neighbor = place.neighbors[i];
        // Don't go in a cycle/loop
        if (been.includes(neighbor)) { continue; }
        const newPlace = { ...neighbor, from: place };
        newPlace.cost = (place.cost || 0)
          + PathFinding.moveCost(place, newPlace)
          + PathFinding.distanceCost(newPlace, finish);

        nextPlaces.push(newPlace);
        been.push(neighbor);
      }
      // Sort ascending order
      nextPlaces.sort((place1, place2) => place1.cost - place2.cost);
      // Remove the first element of array
      place = nextPlaces.shift();
    }
    // "place" is now the destination (and it has a "from" property), or undefined
    let lastDirection;
    const path = [];
    if (place && (place.x !== finish.x || place.y !== finish.y)) {
      path.push(finish);
    }
    // Go backwards through the path using the "from"s that setup before:
    while (place && place.from) {
      const newDirection = PathFinding.getDirection(place, place.from);
      if (lastDirection !== newDirection) {
        lastDirection = newDirection;
        path.push({ x: place.x, y: place.y });
      }
      place = place.from;
    }
    // reverse the path before returning it
    path.reverse();
    return path;
  },

  /**
   * getDirection.
   * Gets the direction between two points
   * @returns {string} something like: '0:0', '-1:0', '1:1', 'origin'
   */
  getDirection(start, finish) {
    return finish
      ? `${Math.sign(start.x - finish.x)}:${Math.sign(start.y - finish.y)}`
      : 'origin';
  },

  /**
   * inArea.
   *
   * @param {} area
   * @param {} point
   */
  inArea(area, point) {
    return area.x <= point.x
      && area.y <= point.y
      && area.x + area.width > point.x
      && area.y + area.height > point.y;
  },

  /**
   * distanceCost.
   *
   * @param start
   * @param finish
   * @returns {number} - distance between start a finish
   */
  distanceCost(start, finish) {
    // This is discounted by half to allow move cost to be more important...
    // if we're okay with unecessary diagonal moves we can remove this
    return (
      (Math.sqrt((finish.x - start.x) ** 2) + (finish.y - start.y) ** 2) / 2
    );
  },

  /**
   * moveCost.
   * A sperate cost calculation for each move.
   * Diagonal moves should be aschewed in favor of straight lines
   * @param {} start
   * @param {} finish
   */
  moveCost(start, finish) {
    // Even if moming is diagonal, it is counted as two movements: horizontal and vertical
    return Math.abs(start.x - finish.x) + Math.abs(start.y - finish.y);
  },

  gridToSubgraph({ grid, width, height, actorSize, x, y }) {
    const subWidth = Math.floor(width / 2);
    const remainderWidth = width - subWidth;
    const subHeight = Math.floor(height / 2);
    const remainderHeight = height - subHeight;

    const isFree = !PathFinding.hasBlock({ grid, x, y, width, height });
    if (width < actorSize && height < actorSize) {
      return [];
    }
    if (isFree) {
      const area = { x, y, width, height, neighbors: [] };
      return [area];
    }
    const topLeft = PathFinding.gridToSubgraph({
      grid,
      width: subWidth,
      height: subHeight,
      actorSize,
      x,
      y,
    });
    const topRight = PathFinding.gridToSubgraph({
      grid,
      width: remainderWidth,
      height: subHeight,
      actorSize,
      x: x + subWidth,
      y,
    });
    const botLeft = PathFinding.gridToSubgraph({
      grid,
      width: subWidth,
      height: remainderHeight,
      actorSize,
      x,
      y: y + subHeight,
    });
    const botRight = PathFinding.gridToSubgraph({
      grid,
      width: remainderWidth,
      height: remainderHeight,
      actorSize,
      x: x + subWidth,
      y: y + subHeight,
    });
    /* eslint-disable no-param-reassign */
    topLeft.forEach((k) => {
      k.neighbors = [...topRight, ...botLeft].filter(
        (t, i, self) => self.indexOf(t) === i && PathFinding.areNeighbors(k, t, actorSize),
      );
    });
    topRight.forEach((k) => {
      k.neighbors = [...topLeft, ...botRight].filter(
        (t, i, self) => self.indexOf(t) === i && PathFinding.areNeighbors(k, t, actorSize),
      );
    });
    botLeft.forEach((k) => {
      k.neighbors = [...topLeft, ...botRight].filter(
        (t, i, self) => self.indexOf(t) === i && PathFinding.areNeighbors(k, t, actorSize),
      );
    });
    botRight.forEach((k) => {
      k.neighbors = [...topRight, ...botLeft].filter(
        (t, i, self) => self.indexOf(t) === i && PathFinding.areNeighbors(k, t, actorSize),
      );
    });
    /* eslint-enable no-param-reassign */
    return [...topLeft, ...topRight, ...botLeft, ...botRight];
  },

  gridToGraph({ grid, width, height, actorSize }) {
    const res = PathFinding.gridToSubgraph({
      grid,
      width,
      height,
      actorSize,
      x: 0,
      y: 0,
    });

    return res.filter((t, i, self) => self.indexOf(t) === i);
  },

  hasBlock({ grid, x, y, width, height }) {
    for (let i = y; i < y + height; i++) {
      for (let j = x; j < x + width; j++) {
        if (grid[i] != null && grid[i][j] > 0) {
          return true;
        }
      }
    }

    return false;
  },

  areNeighbors(a, b, overlap) {
    if (a.x + a.width === b.x || b.x + b.width === a.x) {
      let first = a;
      let last = b;
      if (a.y > b.y) {
        first = b;
        last = a;
      }
      return last.y - first.y <= first.height - overlap;
    }

    if (a.y + a.height === b.y || b.y + b.height === a.y) {
      let first = a;
      let last = b;
      if (a.x > b.x) {
        first = b;
        last = a;
      }
      return last.x - first.x <= first.width - overlap;
    }
    return false;
  },
};
