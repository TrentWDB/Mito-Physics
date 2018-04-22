/**
 * Created by Trent on 4/13/2018.
 */

'use strict';

const MitoPhysicsBody = class MitoPhysicsBody {
    constructor() {
        this._id = MitoPhysicsBody._nextID++;

        this._parentPhysicsBody = null;

        this._position = [0, 0];
        this._velocity = [0, 0];
        this._angle = 0;
        this._angularVelocity = 0;

        this._mass = 0;
        this._centerOfMass = [0, 0];
        this._momentOfInertia = 0;
        this._elasticity = 0.8;

        this._physicsBodyList = [];
        this._circleList = [];

        this._boundingCircle = new MitoBoundingCircle();
    }

    update(interval) {
        this._position[0] += this._velocity[0] * interval;
        this._position[1] += this._velocity[1] * interval;
        this._angle += this._angularVelocity * interval;
    }

    getID() {
        return this._id;
    }

    getPosition() {
        return this._position;
    }

    setPosition(x, y) {
        this._position[0] = x;
        this._position[1] = y;
    }

    getWorldPosition() {
        let parentPosition = this._parentPhysicsBody ? this._parentPhysicsBody.getWorldPosition() : [0, 0];
        let parentAngle = this._parentPhysicsBody ? this._parentPhysicsBody.getWorldAngle() : 0;

        let position = MitoMathHelper.rotatePoint(this._position, parentAngle);

        return [parentPosition[0] + position[0], parentPosition[1] + position[1]];
    }

    getVelocity() {
        return this._velocity;
    }

    setVelocity(x, y) {
        this._velocity[0] = x;
        this._velocity[1] = y;
    }

    getWorldVelocity() {
        let parentVelocity = this._parentPhysicsBody ? this._parentPhysicsBody.getWorldVelocity() : [0, 0];
        let parentAngularVelocity = this._parentPhysicsBody ? this._parentPhysicsBody.getWorldAngularVelocity() : 0;

        let appliedAngularVelocity = MitoMathHelper.applyAngularVelocity(parentAngularVelocity, MitoMathHelper.rotatePoint(this._position, parentAngularVelocity));

        return [parentVelocity[0] + appliedAngularVelocity[0] + this._velocity[0], parentVelocity[1] + appliedAngularVelocity[1] + this._velocity[1]];
    }

    getAngle() {
        return this._angle;
    }

    setAngle(angle) {
        this._angle = angle;
    }

    getWorldAngle() {
        let parentAngle = this._parentPhysicsBody ? this._parentPhysicsBody.getAngle() : 0;

        return parentAngle + this._angle;
    }

    getAngularVelocity() {
        return this._angularVelocity;
    }

    setAngularVelocity(angularVelocity) {
        this._angularVelocity = angularVelocity;
    }

    getWorldAngularVelocity() {
        let parentAngularVelocity = this._parentPhysicsBody ? this._parentPhysicsBody.getWorldAngularVelocity() : 0;

        return parentAngularVelocity + this._angularVelocity;
    }

    getMass() {
        return this._mass;
    }

    updateMass() {
        let mass = 0;

        for (let i = 0; i < this._physicsBodyList.length; i++) {
            this._physicsBodyList[i].updateMass();
            mass += this._physicsBodyList[i].getMass();
        }

        for (let i = 0; i < this._circleList.length; i++) {
            mass += this._circleList[i].getMass();
        }

        this._mass = mass;
    }

    getCenterOfMass() {
        return this._centerOfMass;
    }

    updateCenterOfMass() {
        // requires mass to be updated
        let mass = 0;
        let centerOfMass = [0, 0];

        for (let i = 0; i < this._physicsBodyList.length; i++) {
            this._physicsBodyList[i].updateCenterOfMass();

            let childMass = this._physicsBodyList[i].getMass();
            let childCenterOfMass = this._physicsBodyList[i].getCenterOfMass();

            mass += childMass;
            centerOfMass[0] += childCenterOfMass[0] * childMass;
            centerOfMass[1] += childCenterOfMass[1] * childMass;
        }

        for (let i = 0; i < this._circleList.length; i++) {
            let childMass = this._circleList[i].getMass();
            let childCenterOfMass = this._circleList[i].getPosition();

            mass += childMass;
            centerOfMass[0] += childCenterOfMass[0] * childMass;
            centerOfMass[1] += childCenterOfMass[1] * childMass;
        }

        centerOfMass[0] /= mass;
        centerOfMass[1] /= mass;

        this._centerOfMass[0] = centerOfMass[0];
        this._centerOfMass[1] = centerOfMass[1];
    }

    getWorldCenterOfMass() {
        let position = this.getWorldPosition();

        return [position[0] + this._centerOfMass[0], position[1] + this._centerOfMass[1]];
    }

    getBoundingCircle() {
        return this._boundingCircle;
    }

    updateBoundingCircle() {
        // requires nothing to be updated
        let averagePosition = [0, 0];
        let maxDistance = 0;

        // update and get the average position of all physics body bounding circles
        for (let i = 0; i < this._physicsBodyList.length; i++) {
            let physicsBody = this._circleList[i];
            let physicsBodyPosition = physicsBody.getPosition();
            physicsBody.updateBoundingCircle();

            let boundingCircle = this._physicsBodyList[i].getBoundingCircle();
            let boundingCirclePosition = boundingCircle.getPosition();

            let position = [physicsBodyPosition[0] + boundingCirclePosition[0], physicsBodyPosition[1] + boundingCirclePosition[1]];

            averagePosition[0] += position[0];
            averagePosition[1] += position[1];
        }

        // update and get the average position of all circle bounding circles
        for (let i = 0; i < this._circleList.length; i++) {
            let circle = this._circleList[i];
            let circlePosition = circle.getPosition();
            circle.updateBoundingCircle();

            let boundingCircle = this._circleList[i].getBoundingCircle();
            let boundingCirclePosition = boundingCircle.getPosition();

            let position = [circlePosition[0] + boundingCirclePosition[0], circlePosition[1] + boundingCirclePosition[1]];

            averagePosition[0] += position[0];
            averagePosition[1] += position[1];
        }

        averagePosition[0] /= this._physicsBodyList.length + this._circleList.length;
        averagePosition[1] /= this._physicsBodyList.length + this._circleList.length;

        // get maximum distance to a physics body bounding circle edge
        for (let i = 0; i < this._physicsBodyList.length; i++) {
            let physicsBody = this._circleList[i];
            let physicsBodyPosition = physicsBody.getPosition();

            let boundingCircle = this._physicsBodyList[i].getBoundingCircle();
            let boundingCirclePosition = boundingCircle.getPosition();

            let position = [physicsBodyPosition[0] + boundingCirclePosition[0], physicsBodyPosition[1] + boundingCirclePosition[1]];
            let radius = boundingCircle.getRadius();

            let dx = position[0] - averagePosition[0];
            let dy = position[1] - averagePosition[1];

            maxDistance = Math.max(Math.sqrt(dx * dx + dy * dy) + radius, maxDistance);
        }

        // get maximum distance to a circle bounding circle edge
        for (let i = 0; i < this._circleList.length; i++) {
            let circle = this._circleList[i];
            let circlePosition = circle.getPosition();

            let boundingCircle = this._circleList[i].getBoundingCircle();
            let boundingCirclePosition = boundingCircle.getPosition();

            let position = [circlePosition[0] + boundingCirclePosition[0], circlePosition[1] + boundingCirclePosition[1]];
            let radius = boundingCircle.getRadius();

            let dx = position[0] - averagePosition[0];
            let dy = position[1] - averagePosition[1];

            maxDistance = Math.max(Math.sqrt(dx * dx + dy * dy) + radius, maxDistance);
        }

        this._boundingCircle.setPosition(averagePosition[0], averagePosition[1]);
        this._boundingCircle.setRadius(maxDistance);
    }

    getMomentOfInertia() {
        return this._momentOfInertia;
    }

    updateMomentOfInertia() {
        // requires mass and center of mass to be updated
        let momentOfInertia = 0;

        let completeCircleList = this.getCompleteCircleList();
        for (let i = 0; i < completeCircleList.length; i++) {
            let circle = completeCircleList[i];
            let position = circle.getPosition();
            let density = circle.getDensity();
            let radius = circle.getRadius();
            let dx = position[0] - this._centerOfMass[0];
            let dy = position[1] - this._centerOfMass[1];

            momentOfInertia += 2 / 3 * Math.PI * density * radius * (3 * dx * dx + 3 * dy * dy + radius * radius);
        }

        this._momentOfInertia = momentOfInertia;
    }

    // updateMomentOfInertia() {
    //     // requires mass and center of mass to be updated
    //     let momentOfInertia = 0;
    //
    //     for (let i = 0; i < this._physicsBodyList.length; i++) {
    //         let childMass = this._physicsBodyList[i].getMass();
    //         let childCenterOfMass = this._physicsBodyList[i].getCenterOfMass();
    //         let dx = childCenterOfMass[0] - this._centerOfMass[0];
    //         let dy = childCenterOfMass[1] - this._centerOfMass[1];
    //         let inertiaRadius = dx * dx + dy * dy;
    //
    //         momentOfInertia += childMass * inertiaRadius;
    //     }
    //
    //     for (let i = 0; i < this._circleList.length; i++) {
    //         let circleMass = this._circleList[i].getMass();
    //         let circleCenterOfMass = this._circleList[i].getPosition();
    //         let dx = circleCenterOfMass[0] - this._centerOfMass[0];
    //         let dy = circleCenterOfMass[1] - this._centerOfMass[1];
    //         let inertiaRadius = dx * dx + dy * dy;
    //
    //         momentOfInertia += circleMass * inertiaRadius;
    //     }
    //
    //     this._momentOfInertia = momentOfInertia;
    // }

    getElasticity() {
        return this._elasticity;
    }

    setElasticity(elasticity) {
        this._elasticity = elasticity;
    }

    getParentPhysicsBody() {
        return this._parentPhysicsBody;
    }

    setParentPhysicsBody(physicsBody) {
        this._parentPhysicsBody = physicsBody;
    }

    getPhysicsBodyList() {
        return this._physicsBodyList;
    }

    addPhysicsBody(physicsBody) {
        this._physicsBodyList.push(physicsBody);

        physicsBody.setParentPhysicsBody(this);
    }

    getCircleList() {
        return this._circleList;
    }

    addCircle(circle) {
        this._circleList.push(circle);

        circle.setParentPhysicsBody(this);
    }

    getCompleteCircleList() {
        let circleList = [];

        for (let i = 0; i < this._physicsBodyList.length; i++) {
            let childPhysicsBody = this._physicsBodyList[i];
            let childCircleList = childPhysicsBody.getCompleteCircleList();

            for (let a = 0; a < childCircleList.length; a++) {
                circleList.push(childCircleList[a]);
            }
        }

        for (let i = 0; i < this._circleList.length; i++) {
            circleList.push(this._circleList[i]);
        }

        return circleList;
    }
};

MitoPhysicsBody._nextID = 1;