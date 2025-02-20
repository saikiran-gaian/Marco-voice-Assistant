const axios = require('axios');
module.exports = {
  getProjects: async (req, res) => {
    let { authorization = null } = req.headers;
    const { dbType, projectFilter, peoplesFilter, alertsFilter, size, tenentId } = req.body
    authorization = authorization.includes('Bearer') ? authorization : `Bearer ${authorization}`
    try {
      const getProjects = await axios.post(`https://ig.aidtaas.com/pi-entity-instances-service/v2.0/schemas/67a588e8c6f84f693201afab/instances/list?size=${size}`, {
        "dbType": dbType,
        "filter": {
          ...projectFilter
        }
      }, {
        contentType: 'application/json',
        headers: {
          'authorization': `${authorization}`
        },
      });

      const peoples = await axios.post(`https://ig.aidtaas.com/pi-entity-instances-service/v2.0/schemas/67ac857d2ff0cf1026c02eaf/instances/list?size=${size}`, {
        "dbType": dbType,
        "filter": {
          ...peoplesFilter,
          id: tenentId
        }
      }, {
        contentType: 'application/json',
        headers: {
          'authorization': `${authorization}`
        },
      });

      const peopleData = peoples?.data?.find(item => item.id === tenentId)

      // const alerts = await axios.post(`https://ig.aidtaas.com/pi-entity-instances-service/v2.0/schemas/67adcfe1f920f07661ab6d50/instances/list?size=${size}`, {
      //   "dbType": dbType,
      //   "filter": {
      //     ...alertsFilter
      //   }
      // }, {
      //   contentType: 'application/json',
      //   headers: {
      //     'authorization': `${authorization}`
      //   },
      // });

      const data = getProjects?.data?.map(item => {
        return {
          ...item,
          ...peopleData
        }
      });

      return res.status(200).json({ status: true, data });


    } catch (e) {
      console.log("Error", e)
    }

  },
  getPerformace: async (req, res) => {
    let { authorization = null } = req.headers;
    const { dbType, projectFilter, peoplesFilter, alertsFilter, size, tenentId, metricName = "CPU" } = req.body;

    let data = [];

    const matrix = ["CPU", "memory", "storage"]
    try {
      const getProjects = await axios.post(`https://ig.aidtaas.com/pi-entity-instances-service/v2.0/schemas/67a588e8c6f84f693201afab/instances/list?size=${size}`, {
        "dbType": dbType,
        "filter": {}
      }, {
        contentType: 'application/json',
        headers: {
          'authorization': `${authorization}`
        },
      });


      for (let perMatrix of matrix) {
        const sql = `
  SELECT
    metricsName,
    timestamp,
    ROUND(value, 2) AS value
  FROM
    t_6757c6d13f6e684e36215ebb_t
  WHERE
    metricsName = '${perMatrix}'
  ORDER BY
    timestamp DESC
  LIMIT 1
`;

        const projectPerformance = await axios.post(`https://ig.aidtaas.com/pi-cohorts-service/v1.0/cohorts/adhoc`,
          {
            "definition": sql,
          },
          {
            contentType: 'application/json',
            headers: {
              'authorization': `${authorization}`
            }
          }
        );

        data.push(projectPerformance?.data?.model?.data?.[0])
      }

      const groupeStatus = getProjects?.data?.reduce((acc, item) => {
        if (acc[item.status]) {
          acc[item.status]++
        } else {
          acc[item.status] = 1
        }
        return acc
      }, {});

      return res.send({ status: true, data, groupeStatus });

    } catch (e) {
      console.log("Error", e)
    }
  },

  assignee: async (req, res) => {

    let { authorization = null } = req.headers;
    let name = '';
    if (!!req.body.name) {
      name = req.body.name;
    }

    if (!!req.query.name) {
      name = req.query.name;
    }
    const { size, dbType } = req.body;
    authorization = authorization.includes('Bearer') ? authorization : `Bearer ${authorization}`
    const getProjects = await axios.post(`https://ig.aidtaas.com/pi-entity-instances-service/v2.0/schemas/67a588e8c6f84f693201afab/instances/list?size=${size}`, {
      "dbType": dbType,
      "filter": {
        name: name
      }
    }, {
      contentType: 'application/json',
      headers: {
        'authorization': `${authorization}`
      },
    });

    const peoples = await axios.post(`https://ig.aidtaas.com/pi-entity-instances-service/v2.0/schemas/67ac857d2ff0cf1026c02eaf/instances/list?size=${size}`, {
      "dbType": dbType,
      "filter": {}
    }, {
      contentType: 'application/json',
      headers: {
        'authorization': `${authorization}`
      },
    });

    const assignes = peoples?.data?.map((people, index) => {
      if (getProjects.data?.[0].resourcesallocated?.includes(people.email)) {
        return {
          ...people,
        }
      }
    }).filter(item => item !== undefined);

    return res.send({ status: true, data: assignes });
  }
}