// Lightweight 2D oriented bounding box (on the XZ ground plane) used for
// vehicle/obstacle collision and parking-spot containment checks.
// Rotation is expressed as a single yaw angle since all game objects sit flat on the ground.
export class OBB2D {
  constructor(x, z, halfWidth, halfDepth, angle = 0) {
    this.x = x;
    this.z = z;
    this.halfWidth = halfWidth;
    this.halfDepth = halfDepth;
    this.angle = angle;
  }

  set(x, z, angle) {
    this.x = x;
    this.z = z;
    this.angle = angle;
    return this;
  }

  getAxes() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    // local X axis (width) and local Z axis (depth) in world space
    return [
      { x: cos, z: sin },
      { x: -sin, z: cos },
    ];
  }

  getCorners() {
    const [ax, az] = this.getAxes();
    const w = this.halfWidth;
    const d = this.halfDepth;
    const corners = [];
    for (const [sw, sd] of [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ]) {
      corners.push({
        x: this.x + ax.x * w * sw + az.x * d * sd,
        z: this.z + ax.z * w * sw + az.z * d * sd,
      });
    }
    return corners;
  }

  static projectOntoAxis(corners, axis) {
    let min = Infinity;
    let max = -Infinity;
    for (const c of corners) {
      const p = c.x * axis.x + c.z * axis.z;
      if (p < min) min = p;
      if (p > max) max = p;
    }
    return { min, max };
  }

  // Separating Axis Theorem test between two oriented boxes.
  static intersects(a, b) {
    const cornersA = a.getCorners();
    const cornersB = b.getCorners();
    const axes = [...a.getAxes(), ...b.getAxes()];

    for (const axis of axes) {
      const pa = OBB2D.projectOntoAxis(cornersA, axis);
      const pb = OBB2D.projectOntoAxis(cornersB, axis);
      if (pa.max < pb.min || pb.max < pa.min) {
        return false; // separating axis found
      }
    }
    return true;
  }

  // Returns minimum translation vector to push `a` out of `b`, or null if not overlapping.
  static resolve(a, b) {
    const cornersA = a.getCorners();
    const cornersB = b.getCorners();
    const axes = [...a.getAxes(), ...b.getAxes()];

    let minOverlap = Infinity;
    let minAxis = null;

    for (const axis of axes) {
      const pa = OBB2D.projectOntoAxis(cornersA, axis);
      const pb = OBB2D.projectOntoAxis(cornersB, axis);
      const overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
      if (overlap < 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        minAxis = axis;
        // ensure axis points from b to a
        const dir = (a.x - b.x) * axis.x + (a.z - b.z) * axis.z;
        if (dir < 0) minAxis = { x: -axis.x, z: -axis.z };
      }
    }
    return { x: minAxis.x * minOverlap, z: minAxis.z * minOverlap, overlap: minOverlap };
  }

  // Checks whether box `a` (e.g. the car) lies fully within box `b` (e.g. a parking spot),
  // with an optional inward margin (tolerance in meters).
  static isFullyInside(a, b, margin = 0) {
    const cos = Math.cos(b.angle);
    const sin = Math.sin(b.angle);
    for (const corner of a.getCorners()) {
      const dx = corner.x - b.x;
      const dz = corner.z - b.z;
      // transform into b's local space
      const localX = dx * cos + dz * sin;
      const localZ = -dx * sin + dz * cos;
      if (Math.abs(localX) > b.halfWidth - margin || Math.abs(localZ) > b.halfDepth - margin) {
        return false;
      }
    }
    return true;
  }
}
