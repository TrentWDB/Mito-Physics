/**
 * Created by Trent on 4/13/2018.
 */

const MitoMathHelper = require('./MitoMathHelper');
const MitoPriorityQueueSet = require('./MitoPriorityQueueSet');

'use strict';

const MitoPhysicsWorld = class MitoPhysicsWorld {
    constructor() {
        // used to skip forward in time to when the collisions happen and process them
        this._collisionTimesQueue = new MitoPriorityQueueSet();
        this._collisionTimesToCollisionEventListMap = {};

        // once a physics body is processed all future events are removed from the queue, so this is used
        this._physicsBodyIDToCollisionTimeListMap = {};

        // world information that's used to get all physics bodies and map them to their ids
        this._physicsBodyList = [];
        this._physicsBodyIDToPhysicsBodyMap = {};

        // used later in the loop to reprocess objects after their collisions were resolved
        this._unprocessedPhysicsBodyIDSet = {};
        this._physicsBodyIDToCollisionEventListMap = {}; // TODO can remove this?
    }

    update(interval) {
        // apply accelerations
        for (let i = 0; i < this._physicsBodyList.length; i++) {
            this._physicsBodyList[i].updateAcceleration(interval);
        }

        // get initial collisions
        for (let i = 0; i < this._physicsBodyList.length; i++) {
            let bodyA = this._physicsBodyList[i];

            for (let a = i + 1; a < this._physicsBodyList.length; a++) {
                let bodyB = this._physicsBodyList[a];
                if (!bodyB.checkCollidable(bodyA)) {
                    continue;
                }

                this._determinePhysicsBodyCollisions(bodyA, bodyB, interval, 0);
            }
        }

        // TODO do this better with the quad tree
        let processedInterval = 0;
        while (interval > processedInterval) {
            let remainingInterval = interval - processedInterval;

            // process any collisions that occur on this tick
            let collisionEvents = this._collisionTimesToCollisionEventListMap[processedInterval] || [];
            for (let i = 0; i < collisionEvents.length; i++) {
                let collisionEvent = collisionEvents[i];
                let bodyA = collisionEvent.bodyA;
                let bodyB = collisionEvent.bodyB;
                let collisionPoint = collisionEvent.point;
                let normal = collisionEvent.normal;
                let collisionPointVelocityA = collisionEvent.pointVelocityA;
                let collisionPointVelocityB = collisionEvent.pointVelocityB;

                while (bodyA.getParentPhysicsBody()) {
                    bodyA = bodyA.getParentPhysicsBody();
                }
                while (bodyB.getParentPhysicsBody()) {
                    bodyB = bodyB.getParentPhysicsBody();
                }

                // process the collision
                this._fakeTimMethod(bodyA, bodyB, collisionPoint, normal, collisionPointVelocityA, collisionPointVelocityB);

                this._unprocessedPhysicsBodyIDSet[bodyA.getID()] = true;
                this._unprocessedPhysicsBodyIDSet[bodyB.getID()] = true;
            }

            // remove all collision events that include the unprocessed physics bodies
            // let unprocessedPhysicsBodyIDList = Object.keys(this._unprocessedPhysicsBodyIDSet);
            // for (let i = 0; i < unprocessedPhysicsBodyIDList.length; i++) {
            //     let physicsBodyID = unprocessedPhysicsBodyIDList[i];
            //     let physicsBody = this._physicsBodyIDToPhysicsBodyMap[physicsBodyID];
            //     let collisionEventList = this._physicsBodyIDToCollisionEventListMap[physicsBody.getID()];
            //
            //     // if there are no collision events its because the collided physics body already handled it
            //     if (!collisionEventList) {
            //         continue;
            //     }
            //
            //     for (let a = 0; a < collisionEventList.length; a++) {
            //         let event = collisionEventList[a];
            //         let time = event.time;
            //
            //         // remove the current event from the event list
            //         if (this._collisionTimesToCollisionEventListMap[time]) {
            //             this._collisionTimesToCollisionEventListMap[time] = this._collisionTimesToCollisionEventListMap[time].filter(currentEvent => {
            //                 return currentEvent !== event;
            //             });
            //
            //             // if the new event list is empty then delete it and remove its queue entry
            //             if (this._collisionTimesToCollisionEventListMap[time].length === 0) {
            //                 this._collisionTimesQueue.remove(time);
            //                 delete this._collisionTimesToCollisionEventListMap[time];
            //             }
            //         }
            //     }
            //
            //     // delete the processed physics body id to event list entry
            //     delete this._physicsBodyIDToCollisionEventListMap[physicsBody.getID()];
            // }
            let unprocessedPhysicsBodyIDList = Object.keys(this._unprocessedPhysicsBodyIDSet);
            for (let i = 0; i < unprocessedPhysicsBodyIDList.length; i++) {
                let physicsBodyID = unprocessedPhysicsBodyIDList[i];

                this._removeCollisionEvents(physicsBodyID);
            }

            // process the unprocessed/updated physics bodies
            for (let i = 0; i < unprocessedPhysicsBodyIDList.length; i++) {
                let bodyAID = unprocessedPhysicsBodyIDList[i];
                let bodyA = this._physicsBodyIDToPhysicsBodyMap[bodyAID];

                for (let a = 0; a < this._physicsBodyList.length; a++) {
                    let bodyB = this._physicsBodyList[a];
                    if (bodyA === bodyB) {
                        continue;
                    }

                    if (!bodyB.checkCollidable(bodyA)) {
                        continue;
                    }

                    this._determinePhysicsBodyCollisions(bodyA, bodyB, remainingInterval, processedInterval);
                }
            }


            // DEBUG
            console.log('DEBUG');
            console.log(this._collisionTimesQueue);
            let eventTimes = Object.keys(this._collisionTimesToCollisionEventListMap);
            for (let i = 0; i < eventTimes.length; i++) {
                let eventTime = eventTimes[i];
                let eventList = this._collisionTimesToCollisionEventListMap[eventTime];

                console.log('time: ' + eventTime);
                for (let a = 0; a < eventList.length; a++) {
                    let event = eventList[a];

                    console.log('event number: ' + a);
                    console.log('point: ' + event.point[0] + ',' + event.point[1]);
                    console.log('normal: ' + event.normal[0] + ',' + event.normal[1]);
                    console.log('pointVelocityA: ' + event.pointVelocityA[0] + ',' + event.pointVelocityA[1]);
                    console.log('pointVelocityB: ' + event.pointVelocityB[0] + ',' + event.pointVelocityB[1]);
                }
            }
            // END DEBUG


            this._unprocessedPhysicsBodyIDSet = {};
            this._physicsBodyIDToCollisionEventListMap = {};
            this._physicsBodyIDToCollisionTimeListMap = {};

            // move forward in time to the next collision or the end of the tick
            let nextCollisionTime = this._collisionTimesQueue.pop();
            if (nextCollisionTime === null) {
                nextCollisionTime = interval;
            }

            for (let i = 0; i < this._physicsBodyList.length; i++) {
                this._physicsBodyList[i].update(nextCollisionTime - processedInterval);
            }

            processedInterval = nextCollisionTime;
        }

        this._collisionTimesQueue.clear();
        this._collisionTimesToCollisionEventListMap = {};
    }

    addPhysicsBody(physicsBody) {
        // TODO add this in only after next tick
        this._physicsBodyList.push(physicsBody);
        this._physicsBodyIDToPhysicsBodyMap[physicsBody.getID()] = physicsBody;
    }

    removePhysicsBody(physicsBody) {
        if (!this._physicsBodyIDToPhysicsBodyMap[physicsBody.getID()]) {
            return false;
        }

        this._physicsBodyList = this._physicsBodyList.filter(currentPhysicsBody => currentPhysicsBody.getID() !== physicsBody.getID());
        delete this._physicsBodyIDToPhysicsBodyMap[physicsBody.getID()];

        this._removeCollisionEvents(physicsBody.getID());

        return true;
    }

    _removeCollisionEvents(physicsBodyID) {
        let times = this._physicsBodyIDToCollisionTimeListMap[physicsBodyID] || [];

        for (let i = 0; i < times.length; i++) {
            let time = times[i];

            let collisionEvents = this._collisionTimesToCollisionEventListMap[time];
            if (!collisionEvents) {
                continue;
            }

            // keep the event if neither physics body is the one being removed
            this._collisionTimesToCollisionEventListMap[time] = collisionEvents.filter(event => {
                return event.bodyA.getID() !== physicsBodyID && event.bodyB.getID() !== physicsBodyID;
            });

            if (this._collisionTimesToCollisionEventListMap[time].length === 0) {
                delete this._collisionTimesToCollisionEventListMap[time];
                this._collisionTimesQueue.remove(time);
            }
        }
    }

    _determinePhysicsBodyCollisions(bodyA, bodyB, interval, timeOffset) {
        let boundingCircleA = bodyA.getBoundingCircle();
        let boundingCircleB = bodyB.getBoundingCircle();
        let positionA = bodyA.getWorldPosition();
        let positionB = bodyB.getWorldPosition();
        let velocityA = bodyA.getWorldVelocity();
        let velocityB = bodyB.getWorldVelocity();

        let potentialCollision = MitoMathHelper.detectMitoBoundingCirclePotentialCollision(boundingCircleA, boundingCircleB, positionA, positionB, velocityA, velocityB, interval);
        if (!potentialCollision) {
            return;
        }

        // continue down the tree of physics objects
        let physicsBodyListA = bodyA.getPhysicsBodyList();
        let physicsBodyListB = bodyB.getPhysicsBodyList();

        // body a and body b children
        for (let i = 0; i < physicsBodyListB.length; i++) {
            this._determinePhysicsBodyCollisions(bodyA, physicsBodyListB[i], interval, timeOffset);
        }

        // body b and body a children
        for (let i = 0; i < physicsBodyListA.length; i++) {
            this._determinePhysicsBodyCollisions(physicsBodyListA[i], bodyB, interval, timeOffset);
        }

        // test circles within these physics objects if applicable
        let circleListA = bodyA.getCircleList();
        let circleListB = bodyB.getCircleList();
        for (let i = 0; i < circleListA.length; i++) {
            let circleA = circleListA[i];

            for (let a = 0; a < circleListB.length; a++) {
                let circleB = circleListB[a];

                let relativeTime = MitoMathHelper.detectMitoCircleCollisionTime(circleA, circleB, interval);
                if (relativeTime === null) {
                    continue;
                }

                let circlePositionA = circleA.getWorldPosition();
                let circlePositionB = circleB.getWorldPosition();
                let circleVelocityA = circleA.getWorldVelocity();
                let circleVelocityB = circleB.getWorldVelocity();

                let futurePositionA = [circlePositionA[0] + circleVelocityA[0] * relativeTime, circlePositionA[1] + circleVelocityA[1] * relativeTime];
                let futurePositionB = [circlePositionB[0] + circleVelocityB[0] * relativeTime, circlePositionB[1] + circleVelocityB[1] * relativeTime];
                let collisionPoint = MitoMathHelper.detectCollidingCirclesCollisionPoint(circleA, circleB, futurePositionA, futurePositionB);

                let collisionNormalB = [collisionPoint[0] - circlePositionB[0], collisionPoint[1] - circlePositionB[1]];
                let collisionNormalBLength = Math.hypot(collisionNormalB[0], collisionNormalB[1]);
                collisionNormalB[0] /= collisionNormalBLength;
                collisionNormalB[1] /= collisionNormalBLength;

                // push the collision event info
                let time = timeOffset + relativeTime;
                let collisionEvent = this._createCollisionEvent(time, bodyA, bodyB, collisionPoint, collisionNormalB, circleVelocityA, circleVelocityB);

                let duplicate = (this._collisionTimesToCollisionEventListMap[time] || []).find(existingEvent => {
                    return this._equivalentCollisionEvents(existingEvent, collisionEvent);
                });
                if (duplicate) {
                    continue;
                }

                this._collisionTimesQueue.insert(time);

                this._collisionTimesToCollisionEventListMap[time] = this._collisionTimesToCollisionEventListMap[time] || [];
                this._collisionTimesToCollisionEventListMap[time].push(collisionEvent);

                // push the time into the body id map
                this._physicsBodyIDToCollisionTimeListMap[bodyA.getID()] = this._physicsBodyIDToCollisionTimeListMap[bodyA.getID()] || [];
                this._physicsBodyIDToCollisionTimeListMap[bodyA.getID()].push(time);

                this._physicsBodyIDToCollisionTimeListMap[bodyB.getID()] = this._physicsBodyIDToCollisionTimeListMap[bodyB.getID()] || [];
                this._physicsBodyIDToCollisionTimeListMap[bodyB.getID()].push(time);

                // push the event into the body id map
                this._physicsBodyIDToCollisionEventListMap[bodyA.getID()] = this._physicsBodyIDToCollisionEventListMap[bodyA.getID()] || [];
                this._physicsBodyIDToCollisionEventListMap[bodyA.getID()].push(collisionEvent);

                this._physicsBodyIDToCollisionEventListMap[bodyB.getID()] = this._physicsBodyIDToCollisionEventListMap[bodyB.getID()] || [];
                this._physicsBodyIDToCollisionEventListMap[bodyB.getID()].push(collisionEvent);
            }
        }
    }

    _fakeTimMethod(bodyA, bodyB, collisionPoint, normalB, collisionPointVelocityA, collisionPointVelocityB) {
        let velocityA = bodyA.getVelocity();
        let velocityB = bodyB.getVelocity();
        let angularVelocityA = bodyA.getAngularVelocity();
        let angularVelocityB = bodyB.getAngularVelocity();
        let centerOfMassA = bodyA.getWorldCenterOfMass();
        let centerOfMassB = bodyB.getWorldCenterOfMass();
        let massA = bodyA.getMass();
        let massB = bodyB.getMass();

        let impulseParameter = MitoMathHelper.calculateImpulseParameter(bodyA, bodyB, collisionPoint, normalB, collisionPointVelocityA, collisionPointVelocityB);
        if (impulseParameter === null) {
            return;
        }

        let appliedNormal = [impulseParameter * normalB[0], impulseParameter * normalB[1]];
        let collisionRadiusA = [collisionPoint[0] - centerOfMassA[0], collisionPoint[1] - centerOfMassA[1]];
        let collisionRadiusB = [collisionPoint[0] - centerOfMassB[0], collisionPoint[1] - centerOfMassB[1]];

        let resultingVelocityA = [velocityA[0] + appliedNormal[0] / massA, velocityA[1] + appliedNormal[1] / massA];
        let resultingVelocityB = [velocityB[0] - appliedNormal[0] / massB, velocityB[1] - appliedNormal[1] / massB];

        let resultingAngularVelocityA = angularVelocityA + MitoMathHelper.crossProduct(collisionRadiusA, appliedNormal) / bodyA.getMomentOfInertia();
        let resultingAngularVelocityB = angularVelocityB - MitoMathHelper.crossProduct(collisionRadiusB, appliedNormal) / bodyB.getMomentOfInertia();

        bodyA.setVelocity(resultingVelocityA[0], resultingVelocityA[1]);
        bodyA.setAngularVelocity(resultingAngularVelocityA);
        bodyB.setVelocity(resultingVelocityB[0], resultingVelocityB[1]);
        bodyB.setAngularVelocity(resultingAngularVelocityB);
    }

    _createCollisionEvent(time, bodyA, bodyB, collisionPoint, normalB, collisionPointVelocityA, collisionPointVelocityB) {
        return {
            time: time,
            bodyA: bodyA,
            bodyB: bodyB,
            point: collisionPoint,
            normal: normalB,
            pointVelocityA: collisionPointVelocityA,
            pointVelocityB: collisionPointVelocityB,
        }
    }
    
    _equivalentCollisionEvents(eventA, eventB) {
        let regular = eventA.time === eventB.time &&
            eventA.bodyA.getID() === eventB.bodyA.getID() &&
            eventA.bodyB.getID() === eventB.bodyB.getID() &&
            eventA.point[0] === eventB.point[0] &&
            eventA.point[1] === eventB.point[1] &&
            eventA.pointVelocityA[0] === eventB.pointVelocityA[0] &&
            eventA.pointVelocityA[1] === eventB.pointVelocityA[1] &&
            eventA.pointVelocityB[0] === eventB.pointVelocityB[0] &&
            eventA.pointVelocityB[1] === eventB.pointVelocityB[1];
        if (regular) {
            return true;
        }

        let inverted = eventA.time === eventB.time &&
            eventA.bodyA.getID() === eventB.bodyB.getID() &&
            eventA.bodyB.getID() === eventB.bodyA.getID() &&
            eventA.point[0] === eventB.point[0] &&
            eventA.point[1] === eventB.point[1] &&
            eventA.pointVelocityA[0] === eventB.pointVelocityB[0] &&
            eventA.pointVelocityA[1] === eventB.pointVelocityB[1] &&
            eventA.pointVelocityB[0] === eventB.pointVelocityA[0] &&
            eventA.pointVelocityB[1] === eventB.pointVelocityA[1];
        if (inverted) {
            return true;
        }

        return false;
    }
};

module.exports = MitoPhysicsWorld;