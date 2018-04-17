/**
 * Created by Trent on 4/13/2018.
 */

const MitoMathHelper = class MitoMathHelper {

    /**
     * Calculates the time at which two circles will collide between 0 - 1.
     * @param circleA
     * @param velocityA
     * @param circleB
     * @param velocityB
     * @param interval - tick interval
     * @returns {*}
     * @private
     */
    static _detectCollisionTime(circleA, velocityA, circleB, velocityB, interval) {
        let velocityIntA = this._multiplyPoint(velocityA, interval);
        let invertedVelocityB = this._invertPoint(this._multiplyPoint(velocityB, interval));
        let combineVelocity = this._addPoints(velocityIntA, invertedVelocityB);
        let combineMagnitude = Math.hypot(combineVelocity[0], combineVelocity[1]);
        //Early escape: Calculate bounds based on combine velocities
        if (!this._detectCollision(circleA.getPosition(),
            circleA.getRadius() + combineMagnitude,
            circleB.getPosition(),
            circleB.getRadius())) {
            return null;
        }
        //Calculate closest point on combined velocities to circleB
        let appliedVelocitiesToPositionA = this._addPoints(circleA.getPosition(), combineVelocity);
        let closestPoint = this._getClosestPoint(circleA.getPosition(),
            appliedVelocitiesToPositionA,
            circleB.getPosition());
        //If closest circle is in range calculate back off distance
        //Tick percentage should be between 0 - 1
        let distance = this._distanceBetweenTwoPointsNoSqrt(closestPoint, circleB.getPosition());
        let radiusTotal = circleA.getRadius() + circleB.getRadius();
        radiusTotal *= radiusTotal;
        if (radiusTotal >= distance) {
            let backOff = Math.sqrt(radiusTotal - distance);
            let backPoint = [backOff * (combineVelocity[0] / combineMagnitude), backOff * (combineVelocity[1] / combineMagnitude)];
            let closestPointWithinVelocity = this._addPoints(closestPoint, this._invertPoint(backPoint));
            let distanceBetween = this._distanceBetweenTwoPoints(circleA.getPosition(), closestPointWithinVelocity);
            let tickPercentage = distanceBetween / combineMagnitude;
            if (tickPercentage < 0 || tickPercentage > 1) {
                return null;
            }
            return tickPercentage;
        }
        return null;
    }

    /**
     * returns distance ^ 2
     * @param pointA
     * @param pointB
     * @returns {number}
     * @private
     */
    static _distanceBetweenTwoPointsNoSqrt(pointA, pointB) {
        let xDifference = pointB[0] - pointA[0];
        let yDifference = pointB[1] - pointA[1];
        return xDifference * xDifference + yDifference * yDifference;
    }

    /**
     * returns distance between two points
     * @param pointA
     * @param pointB
     * @returns {number}
     * @private
     */
    static _distanceBetweenTwoPoints(pointA, pointB) {
        return Math.hypot(pointB[0] - pointA[0], pointB[1] - pointA[1]);
    }

    /**
     * detects if two circles overlap
     * @param pointA
     * @param radiusA
     * @param pointB
     * @param radiusB
     * @returns {boolean}
     * @private
     */
    static _detectCollision(pointA, radiusA, pointB, radiusB) {
        let distance = Math.hypot(
            pointA[0] - pointB[0],
            pointA[1] - pointB[1]);
        let radiusTotal = radiusA + radiusB;
        return radiusTotal >= distance;
    }

    /**
     * return the closest point on a line to a single point
     * @param linePointA
     * @param linePointB
     * @param singlePoint
     * @returns {*}
     * @private
     */
    static _getClosestPoint(linePointA, linePointB, singlePoint) {
        let aToP = [singlePoint[0] - linePointA[0], singlePoint[1] - linePointA[1]];
        let aToB = [linePointB[0] - linePointA[0], linePointB[1] - linePointA[1]];
        let aToB2 = (aToB[0] * aToB[0]) + (aToB[1] * aToB[1]);
        if (aToB2 === 0) {
            return linePointA;
        }
        let atpDotAtb = (aToP[0] * aToB[0]) + (aToP[1] * aToB[1]);
        let normalizedDistance = atpDotAtb / aToB2;
        return [linePointA[0] + (aToB[0] * normalizedDistance), linePointA[1] + (aToB[1] * normalizedDistance)]
    }

    /**
     * add two points
     * @param pointA
     * @param pointB
     * @returns {*[]}
     * @private
     */
    static _addPoints(pointA, pointB) {
        return [pointA[0] + pointB[0], pointA[1] + pointB[1]];
    }

    /**
     * invert a point
     * @param point
     * @returns {*[]}
     * @private
     */
    static _invertPoint(point) {
        return [-point[0], -point[1]];
    }

    /**
     * multiply a point by a number
     * @param point
     * @param value
     * @returns {*[]}
     * @private
     */
    static _multiplyPoint(point, value) {
        return [point[0] * value, point[1] * value];
    }

};