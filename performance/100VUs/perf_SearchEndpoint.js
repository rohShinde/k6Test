import { Httpx } from 'https://jslib.k6.io/httpx/0.0.6/index.js';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';

import { getBearerToken, checkStatus } from '../../support/utils.js';
import { searchAllEntities, searchSingleEntity } from '../../support/federatedSearch.js';

const session = new Httpx({
    baseURL: __ENV.BASE_URL
})

export let options = {
    stages: [
        { target: 100, duration: "2m" },
        { target: 100, duration: "6m" },
        { target: 0, duration: "2m" }
    ],

    thresholds: {
        http_req_duration: ['p(99) < 2000']
    }
}

export function setup() {
    let setup = {}
    setup['bearerToken'] = getBearerToken(__ENV.AUTH_KEY, __ENV.AUTH_USER)
    
    let response = searchAllEntities(setup['bearerToken'])
    let body = JSON.parse(response.body)
    let arrEntities = []
    for (var i = 0; i < body.results[0].records.length; i++) {
        arrEntities[i] = body.results[0].records[i].primary.properties.mg_display_label
    }
    setup['entities'] = arrEntities

    return setup;
}

export default function(setup) {
    let entity = setup['entities'][randomIntBetween(0, setup['entities'].length-1)]
    let response = searchSingleEntity(setup['bearerToken'], entity)

    checkStatus({
        response: response,
        name: 'FederatedSearch',
        expectedStatus: 200,
        failOnError: false,
        printOnError: false
    })
}