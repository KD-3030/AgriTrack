/**
 * Mock Data Generator - Generates live sensor data without MQTT
 * Use this when MQTT broker is not available
 */

class MockDataGenerator {
  constructor() {
    this.machines = [];
    this.interval = null;
  }

  initialize(machineIds) {
    this.machines = machineIds.map(id => ({
      id,
      lat: 30.9 + Math.random() * 2,
      lng: 75.8 + Math.random() * 2,
      temp: 60 + Math.random() * 40,
      speed: Math.random() * 15,
      fuel: 50 + Math.random() * 50,
      heading: Math.random() * 360,
      vib_x: Math.random() * 0.3,
      vib_y: Math.random() * 0.3,
      vib_z: Math.random() * 0.3
    }));
    console.log(`🎲 Initialized mock data for ${this.machines.length} machines`);
  }

  start(callback, intervalMs = 3000) {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      this.machines.forEach(machine => {
        // Update values realistically
        machine.lat += (Math.random() - 0.5) * 0.001;
        machine.lng += (Math.random() - 0.5) * 0.001;
        machine.temp = Math.max(50, Math.min(100, machine.temp + (Math.random() - 0.5) * 5));
        machine.speed = Math.max(0, Math.min(20, machine.speed + (Math.random() - 0.5) * 2));
        machine.fuel = Math.max(0, Math.min(100, machine.fuel - Math.random() * 0.5));
        machine.heading = (machine.heading + (Math.random() - 0.5) * 10) % 360;
        machine.vib_x = Math.max(0, Math.min(0.8, machine.vib_x + (Math.random() - 0.5) * 0.1));
        machine.vib_y = Math.max(0, Math.min(0.8, machine.vib_y + (Math.random() - 0.5) * 0.1));
        machine.vib_z = Math.max(0, Math.min(0.8, machine.vib_z + (Math.random() - 0.5) * 0.1));

        const data = {
          id: machine.id,
          gps: [machine.lat, machine.lng],
          temp: parseFloat(machine.temp.toFixed(1)),
          vib_x: parseFloat(machine.vib_x.toFixed(3)),
          vib_y: parseFloat(machine.vib_y.toFixed(3)),
          vib_z: parseFloat(machine.vib_z.toFixed(3)),
          speed: parseFloat(machine.speed.toFixed(1)),
          mode: machine.speed > 1 ? 'active' : 'idle',
          heading: parseFloat(machine.heading.toFixed(1)),
          fuel: parseFloat(machine.fuel.toFixed(1)),
          timestamp: new Date().toISOString()
        };

        callback(data);
      });
    }, intervalMs);

    console.log(`🎲 Mock data generator started (${intervalMs}ms interval)`);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Mock data generator stopped');
    }
  }
}

module.exports = new MockDataGenerator();
