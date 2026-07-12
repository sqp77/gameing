/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { makeSeededRandom, degToRad } from '../utils/MathUtils.js';
import { makeSpot } from '../world/levels.js';
import * as propKit from '../world/propKit.js';
import { REPUTATION_DELTA } from '../utils/reputation.js';
import { pickJobType, generateJob, pickDropoff } from '../data/jobs.js';
import { HUB_JOB_MARKERS } from '../data/hubMap.js';

// Dropoffs are drawn from the job-marker pool only (not landmarks) so every dropoff fires
// HubTriggerManager's `enterJobMarker` event uniformly — one trigger channel for the whole
// Job System instead of also having to watch landmark-entry events.
const DROPOFF_CANDIDATES = HUB_JOB_MARKERS;

// Job System (Feature 2): assigns a randomized job to whichever hub job-marker the player
// reaches while idle, offered as an Accept/Decline prompt rather than forced. Reuses
// ParkingManager verbatim for "Vehicle Parking Jobs" and for "Valet Parking Missions"'
// drop-off leg (both are just a makeSpot()-shaped OBB handed to the same
// success-detection ParkingManager already runs for every other parking task in the
// game); "Delivery"/"Taxi" missions are a single drive-to-a-dropoff-marker proximity
// check via HubTriggerManager — no new gameplay primitive for any of the four types.
export class JobManager extends EventEmitter {
  constructor(save, parkingManager, hubGroup) {
    super();
    this.save = save;
    this.parking = parkingManager;
    this.hubGroup = hubGroup;
    this.pendingOffer = null; // { marker, job } — awaiting Accept/Decline
    this.activeJob = null; // { ...job, stage, dropoff, timeRemaining }
    this._decal = null; // temporary target-spot ground marking for parking/valet jobs
    this._rng = makeSeededRandom(Date.now() & 0xffffffff);
  }

  reset() {
    this._clearDecal();
    this.parking.setSpots([]);
    this.pendingOffer = null;
    this.activeJob = null;
  }

  _clearDecal() {
    if (!this._decal) return;
    for (const obj of this._decal) {
      this.hubGroup.remove(obj);
      obj.traverse?.((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
    }
    this._decal = null;
  }

  // Called by GameManager for every HubTriggerManager `enterJobMarker` event — handles both
  // "arrived at an idle marker" (offer a new job) and "arrived at the active job's dropoff"
  // (complete Delivery/Taxi immediately, or arm the parking spot for Valet's final leg).
  onEnterMarker(marker, driverLevel) {
    const job = this.activeJob;
    if (job) {
      if (job.stage === 'travel' && job.dropoffId === marker.id) {
        if (job.type === 'valet') {
          job.stage = 'dropoff';
          this._armValetDropoff();
          this.emit('progress', job);
        } else {
          this._completeActive(true);
        }
      }
      return;
    }
    if (this.pendingOffer) return;
    const type = pickJobType(this._rng);
    const job2 = generateJob(type, driverLevel, marker.id, this._rng);
    this.pendingOffer = { marker, job: job2 };
    this.emit('offer', { marker, job: job2 });
  }

  onExitMarker() {
    if (this.pendingOffer) {
      this.pendingOffer = null;
      this.emit('offerCancelled');
    }
  }

  acceptOffer(driverLevel) {
    if (!this.pendingOffer) return;
    const { marker, job } = this.pendingOffer;
    this.pendingOffer = null;

    if (job.type === 'parking' || job.type === 'valet') {
      if (job.type === 'parking') {
        this._armParkingSpot(marker, job);
        this.activeJob = { ...job, stage: 'parking', timeRemaining: job.timeLimit };
      } else {
        const dropoff = pickDropoff(DROPOFF_CANDIDATES, marker, driverLevel, this._rng);
        this.activeJob = { ...job, stage: 'travel', dropoffId: dropoff.id, dropoffPos: dropoff, timeRemaining: job.timeLimit };
      }
    } else {
      const dropoff = pickDropoff(DROPOFF_CANDIDATES, marker, driverLevel, this._rng);
      this.activeJob = { ...job, stage: 'dropoff', dropoffId: dropoff.id, dropoffPos: dropoff, timeRemaining: job.timeLimit };
    }
    this.save.setActiveJob({ type: job.type, markerId: marker.id });
    this.emit('started', this.activeJob);
  }

  declineOffer() {
    this.pendingOffer = null;
    this.emit('offerCancelled');
  }

  _armParkingSpot(marker, job) {
    const heading = (Math.floor(this._rng() * 4) * Math.PI) / 2;
    const spot = makeSpot({
      id: 'job-spot',
      x: marker.x,
      z: marker.z,
      heading,
      width: job.spotWidth,
      depth: job.spotDepth,
      type: 'perpendicular',
      tolerance: job.spotTolerance,
      isTarget: true,
      holdTime: 1.0,
    });
    this.parking.setSpots([spot]);
    const before = new Set(this.hubGroup.children);
    propKit.buildSpotMarkings(this.hubGroup, { lineColor: 0x00e5ff }, [spot]);
    propKit.buildTargetSign(this.hubGroup, spot);
    this._decal = this.hubGroup.children.filter((c) => !before.has(c));
  }

  // Valet's dropoff leg reuses the exact same parking-spot arm/detect path as a Parking Job,
  // just triggered once the player reaches the dropoff marker instead of at Accept time.
  _armValetDropoff() {
    const job = this.activeJob;
    const pos = job.dropoffPos;
    const heading = (Math.floor(this._rng() * 4) * Math.PI) / 2;
    const spot = makeSpot({
      id: 'job-spot',
      x: pos.x,
      z: pos.z,
      heading,
      width: job.spotWidth,
      depth: job.spotDepth,
      type: 'perpendicular',
      tolerance: job.spotTolerance,
      isTarget: true,
      holdTime: 1.0,
    });
    this.parking.setSpots([spot]);
    const before = new Set(this.hubGroup.children);
    propKit.buildSpotMarkings(this.hubGroup, { lineColor: 0x00e5ff }, [spot]);
    propKit.buildTargetSign(this.hubGroup, spot);
    this._decal = this.hubGroup.children.filter((c) => !before.has(c));
  }

  // GameManager routes ParkingManager's 'success' event here when a parking-type job spot is
  // armed (Parking Jobs, or Valet's dropoff leg).
  completeActiveParkingSuccess() {
    if (!this.activeJob) return;
    this._completeActive(true);
  }

  update(dt) {
    if (!this.activeJob) return;
    this.activeJob.timeRemaining -= dt;
    if (this.activeJob.timeRemaining <= 0) this._completeActive(false);
  }

  _completeActive(success) {
    const job = this.activeJob;
    if (!job) return;
    this._clearDecal();
    this.parking.setSpots([]);
    this.activeJob = null;
    this.save.clearActiveJob();

    let reward = { coins: 0, xp: 0 };
    let reputation = null;
    if (success) {
      reward = { coins: job.coins, xp: job.xp };
      this.save.addCoins(job.coins);
      this.save.addXP(job.xp);
      reputation = this.save.addReputation(REPUTATION_DELTA.missionSuccess);
    } else {
      reputation = this.save.addReputation(REPUTATION_DELTA.missionFailure);
    }
    this.save.recordJobResult(job.type, success, reward);
    this.emit(success ? 'completed' : 'failed', { job, reward, reputation });
  }
}
