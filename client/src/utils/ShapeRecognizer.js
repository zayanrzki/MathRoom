/**
 * ShapeRecognizer - Utility class untuk mendeteksi dan mengubah hand-drawn shapes
 * menjadi perfect geometric shapes
 */

export class ShapeRecognizer {
    constructor() {
        // Threshold values untuk detection
        this.LINE_THRESHOLD = 0.15; // 15% tolerance untuk line straightness
        this.CIRCLE_THRESHOLD = 0.2; // 20% tolerance untuk circle roundness
        this.ANGLE_THRESHOLD = 15; // ±15° tolerance untuk right angles
        this.MIN_POINTS = 10; // Minimum points untuk recognition
    }

    /**
     * Main recognition function - tries to detect shape type
     * @param {Array} points - Array of {x, y} points from drawn path
     * @returns {Object|null} - Fabric.js shape object or null
     */
    recognize(points) {
        if (!points || points.length < this.MIN_POINTS) {
            return null;
        }

        // Try each shape detection in order of complexity
        // (simpler shapes first)

        // 1. Try line detection
        const line = this.detectLine(points);
        if (line) return line;

        // 2. Try circle detection
        const circle = this.detectCircle(points);
        if (circle) return circle;

        // 3. Try rectangle detection
        const rectangle = this.detectRectangle(points);
        if (rectangle) return rectangle;

        // 4. Try triangle detection
        const triangle = this.detectTriangle(points);
        if (triangle) return triangle;

        // No shape detected - return null (keep freehand drawing)
        return null;
    }

    /**
     * Detect if points form a straight line
     */
    detectLine(points) {
        // Use linear regression to find best-fit line
        const { slope, intercept, r2 } = this.linearRegression(points);

        // If R² > threshold, it's a good line fit
        if (r2 > (1 - this.LINE_THRESHOLD)) {
            const start = points[0];
            const end = points[points.length - 1];

            return {
                type: 'line',
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y
            };
        }

        return null;
    }

    /**
     * Detect if points form a circle
     */
    detectCircle(points) {
        // Calculate center point
        const center = this.calculateCenter(points);

        // Calculate all distances from center
        const distances = points.map(p =>
            this.calculateDistance(p, center)
        );

        // Calculate average radius and variance
        const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = this.calculateVariance(distances, avgRadius);

        // If variance is low, it's a circle
        if (variance < this.CIRCLE_THRESHOLD) {
            return {
                type: 'circle',
                centerX: center.x,
                centerY: center.y,
                radius: avgRadius
            };
        }

        return null;
    }

    /**
     * Detect if points form a rectangle
     */
    detectRectangle(points) {
        // Find corners (points where direction changes significantly)
        const corners = this.findCorners(points);

        // Rectangle should have 4 corners
        if (corners.length !== 4) {
            return null;
        }

        // Check if angles are approximately 90 degrees
        const angles = this.calculateAngles(corners);
        const rightAngles = angles.filter(angle =>
            Math.abs(angle - 90) < this.ANGLE_THRESHOLD
        );

        if (rightAngles.length >= 3) { // At least 3 right angles
            // Sort corners to get proper rectangle
            const sorted = this.sortRectangleCorners(corners);

            return {
                type: 'rectangle',
                corners: sorted
            };
        }

        return null;
    }

    /**
     * Detect if points form a triangle
     */
    detectTriangle(points) {
        const corners = this.findCorners(points);

        // Triangle should have 3 corners
        if (corners.length === 3) {
            return {
                type: 'triangle',
                corners: corners
            };
        }

        return null;
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * Linear regression to find best-fit line
     */
    linearRegression(points) {
        const n = points.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
            sumY2 += p.y * p.y;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R² (coefficient of determination)
        const yMean = sumY / n;
        let ssRes = 0, ssTot = 0;

        points.forEach(p => {
            const yPred = slope * p.x + intercept;
            ssRes += Math.pow(p.y - yPred, 2);
            ssTot += Math.pow(p.y - yMean, 2);
        });

        const r2 = 1 - (ssRes / ssTot);

        return { slope, intercept, r2 };
    }

    /**
     * Calculate center point of points array
     */
    calculateCenter(points) {
        const sumX = points.reduce((sum, p) => sum + p.x, 0);
        const sumY = points.reduce((sum, p) => sum + p.y, 0);

        return {
            x: sumX / points.length,
            y: sumY / points.length
        };
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );
    }

    /**
     * Calculate variance of values
     */
    calculateVariance(values, mean) {
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff) / mean; // Normalized variance
    }

    /**
     * Find corners in path (points where direction changes)
     */
    findCorners(points) {
        const corners = [];
        const threshold = 30; // Minimum angle change to be considered a corner

        for (let i = 5; i < points.length - 5; i++) {
            const prev = points[i - 5];
            const curr = points[i];
            const next = points[i + 5];

            const angle = this.calculateAngle(prev, curr, next);

            // If angle change is significant, it's a corner
            if (Math.abs(180 - angle) > threshold) {
                corners.push(curr);
                i += 10; // Skip nearby points
            }
        }

        return corners;
    }

    /**
     * Calculate angle between three points (in degrees)
     */
    calculateAngle(p1, p2, p3) {
        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        let angle = Math.abs(angle1 - angle2) * (180 / Math.PI);

        if (angle > 180) {
            angle = 360 - angle;
        }

        return angle;
    }

    /**
     * Calculate angles for all corners
     */
    calculateAngles(corners) {
        const angles = [];
        const n = corners.length;

        for (let i = 0; i < n; i++) {
            const prev = corners[(i - 1 + n) % n];
            const curr = corners[i];
            const next = corners[(i + 1) % n];

            angles.push(this.calculateAngle(prev, curr, next));
        }

        return angles;
    }

    /**
     * Sort rectangle corners in proper order (top-left, top-right, bottom-right, bottom-left)
     */
    sortRectangleCorners(corners) {
        // Sort by y first, then by x
        const sorted = [...corners].sort((a, b) => {
            if (Math.abs(a.y - b.y) < 20) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });

        // Get top two and bottom two
        const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

        return [
            top[0],    // top-left
            top[1],    // top-right
            bottom[1], // bottom-right
            bottom[0]  // bottom-left
        ];
    }
}

export default new ShapeRecognizer();
