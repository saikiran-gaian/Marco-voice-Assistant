const axios = require('axios');
module.exports = {
    groupbyproject: async (req, res) => {

        const { name, size } = req.query || req.body;

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
            if(getProjects.resourcesallocated?.[index].includes(people.email)){
                return {
                    ...people,
                }
            }
        });

        console.log("assignes", assignes);

    }
}