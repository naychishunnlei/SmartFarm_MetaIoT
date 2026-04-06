import pool from '../config/database.js'

class SensorRepository {
  async saveSensorData(sensorData) {
    const {
      hardware_id, 
      zone_id, // This is the LOCAL zone_id (1, 2, or 3) sent by the ESP32
      temperature,
      humidity,
      light_lux = 0,
      moisture_1,
      moisture_2 = null,
      moisture_3 = null,
      pump,
      fan,
      light
    } = sensorData

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // 1. LOOKUP THE FARM ID USING THE HARDWARE ID
      const farmLookupQuery = `SELECT id FROM farms WHERE hardware_id = $1`
      const farmLookupResult = await client.query(farmLookupQuery, [hardware_id])

      // If the device hasn't been claimed by a user yet, ignore the data
      if (farmLookupResult.rowCount === 0) {
          throw new Error(`Device ${hardware_id} is not registered to any user.`)
      }

      const farm_id = farmLookupResult.rows[0].id

      // --- 🌟 THE NEW SMART TRANSLATOR 🌟 ---
      // 1.5 Translate the ESP32's local zone_id (1, 2, 3) into the Database's Global Zone ID
      // We order the zones by ID. Zone 1 is OFFSET 0 (the first zone), Zone 2 is OFFSET 1, etc.
      const offsetIndex = zone_id - 1; 
      const zoneLookupQuery = `
        SELECT id FROM zones 
        WHERE farm_id = $1 
        ORDER BY id ASC 
        LIMIT 1 OFFSET $2
      `
      const zoneLookupResult = await client.query(zoneLookupQuery, [farm_id, offsetIndex])
      
      if (zoneLookupResult.rowCount === 0) {
          throw new Error(`Local Zone ${zone_id} is not set up in the database for this farm yet.`)
      }
      
      const global_zone_id = zoneLookupResult.rows[0].id
      // ---------------------------------------

      // 2. Insert into farm_sensor_logs
      const farmQuery = `
        INSERT INTO farm_sensor_logs
          (farm_id, temperature, humidity, light_lux, fan, light)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `
      const safeTemp = (temperature === 'null' || temperature === 'nan') ? null : temperature;
      const safeHum = (humidity === 'null' || humidity === 'nan') ? null : humidity;

      const farmResult = await client.query(farmQuery, [farm_id, safeTemp, safeHum, light_lux, fan, light])

      // 3. Insert into zone_sensor_logs (USING THE NEW GLOBAL ZONE ID)
      const zoneQuery = `
        INSERT INTO zone_sensor_logs
          (zone_id, moisture_1, moisture_2, moisture_3, pump)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `
      const zoneResult = await client.query(zoneQuery, [global_zone_id, moisture_1, moisture_2, moisture_3, pump])

      await client.query('COMMIT')

      return {
        farm_log_id: farmResult.rows[0].id,
        zone_log_id: zoneResult.rows[0].id,
        farm_id,
        global_zone_id
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error 
    } finally {
      client.release()
    }
  }
}

export default new SensorRepository()