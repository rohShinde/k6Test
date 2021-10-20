import { check, sleep } from "k6";
import http from "k6/http";

export let options = {
    scenarios: {
        AddToGraph: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: 1,
            maxDuration: '60s',
            exec: 'addToMap'
        }
    },

    thresholds: {
    // 99% of requests must finish within 1000ms.
        http_req_duration: ['p(99) < 2000'],
    }
}

export function setup() {
    let setup = {}
    setup['baseURL'] = __ENV.BASE_URL

    let payload = JSON.stringify(
        {
            api_key: `${__ENV.AUTH_KEY}`,
            consumer_id: `${__ENV.AUTH_USER}`
        }
    );

    let res = http.post(
        'https://dev.missiongraph.io/auth/token',
        payload,
        {
            headers: { "Content-Type": "application/json" }
        }
    );
    sleep(2)

    let bearerToken = JSON.stringify((JSON.parse(res.body)).access_token);
    bearerToken = bearerToken.substr(1, bearerToken.length - 2);
    setup['bearerToken'] = bearerToken
    
    payload = JSON.stringify(
        {
            "sources": [{ "name": "internal", "limit": 20, "props": {} }],
            "facets": [{ "field": "mg_entity_type", "limit": 10 }],
            "limit": 10000,
            "params": {
            "clauses": [
                {
                "properties": [
                    {
                    "propertyName": "mg_display_label",
                    "values": ["719 W Muirwood Dr"],
                    "matchType": "text"
                    }
                ],
                "operator": "AND"
                }
            ],
            "operator": "AND"
            }
        }
    );

    res = http.post(
        `${setup['baseURL']}/api/search/federated`,
        payload,
        {
            headers: { 
                authorization: `Bearer ${setup['bearerToken']}`,
                "Content-Type": "application/json; charset=UTF-8" 
            }
        }
    );
    sleep(2)
    
    let body = JSON.parse(res.body);
    setup['entityID'] = body.results[0].records[0].primary.id
    setup['entityProps'] = JSON.stringify(body.results[0].records[0].primary.properties)
    setup['entityPropLat'] = body.results[0].records[0].primary.properties.latitude
    setup['entityPropLong'] = body.results[0].records[0].primary.properties.longitude
    
    return setup;
}

export function addToMap(setup) {
    let name = "k6-" + Math.random().toString(20).substr(2, 6)
    let payload = `[{"variables":{"artifact":{"type":"MAP","name":"${name}","data":{"elementIds":[],"pendingIds":[],"navigation":null,"version":8,"mergedIds":[],"timebar":{"active":false,"settings":null},"queries":[],"highlights":{},"cardinality":"any","directed":false,"analyticType":"","filters":{},"subfilters":{},"layout":"Standard","hiddenNodeIds":[],"primaryNodes":[],"paths":[],"combos":[],"chart":{},"viewOptions":null,"viewportShape":null,"usingUUIDS":true,"tree":{"id":"root","children":[]}}}},"query":"mutation ($artifact: CreateArtifactInput!) {\\n  createArtifact(artifact: $artifact) {\\n    ...artifact\\n    subscribers {\\n      ...subscriber\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment artifact on Artifact {\\n  id\\n  data\\n  name\\n  user_id\\n  is_owner\\n  type\\n  preview\\n  created_at\\n  updated_at\\n  __typename\\n}\\n\\nfragment subscriber on ArtifactSubscriber {\\n  user_id\\n  artifact_id\\n  is_owner\\n  roles\\n  subscriber_id\\n  created_at\\n  updated_at\\n  __typename\\n}\\n"}]`
    
    let res = http.post(
        `${setup['baseURL']}/api/workspaces/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(5)
    check(res, {
        'Create Artifact status is 200': (r) => r.status === 200,
    })
    
    let artifactID = JSON.parse(res.body)[0].data.createArtifact.id
    
    payload = `[{"variables":{"event":{"type":"map/SET_POINTS","data":{"points":[{"point":["${setup['entityPropLong']}","${setup['entityPropLat']}"],"key":"${setup['entityID']}:Address","title":"Address","element":{"id":"${setup['entityID']}","typename":"location","raw":{"id":"${setup['entityID']}","label":"location","type":"Entity","properties":${setup['entityProps']}}}}]}},"artifactId":"${artifactID}"},"query":"mutation ($artifactId: String!, $event: EventInput!) {\\n  pushEvent(artifactId: $artifactId, event: $event)\\n}\\n"},{"variables":{"event":{"type":"map/UPDATE_MAP_VIEWPORT","data":{"filters":{},"subfilters":{},"viewport":{"zoom":[10],"pitch":[0],"bearing":[0],"center":["${setup['entityPropLong']}","${setup['entityPropLat']}"]},"mapStyle":"LIGHT","points":[{"point":["${setup['entityPropLong']}","${setup['entityPropLat']}"],"key":"${setup['entityID']}:Address","title":"Address","element":{"id":"${setup['entityID']}","typename":"location","raw":{"id":"${setup['entityID']}","label":"location","type":"Entity","properties":${setup['entityProps']}}}}]}},"artifactId":"${artifactID}"},"query":"mutation ($artifactId: String!, $event: EventInput!) {\\n  pushEvent(artifactId: $artifactId, event: $event)\\n}\\n"},{"variables":{"event":{"type":"map/UPDATE_FILTERS","data":{"filters":{"licensure":true,"ip_address":true,"risk_flags":true,"foreclosure":true,"education":true,"id_number":true,"location":true,"tax_liens":true,"government":true,"company":true,"intellectual_property":true,"contact_number":true,"sam_exclusion":true,"other_assets":true,"officer":true,"loan":true,"real_estate":true,"medical_board_actions":true,"vehicles":true,"adverse_media":true,"individual":true,"sanctions":true,"court_actions":true,"name":true,"digital_footprint":true,"bankruptcies":true,"institution":true,"filings":true,"alert_flags":true},"subfilters":{"location":{}},"viewport":{"zoom":[10],"pitch":[0],"bearing":[0],"center":["${setup['entityPropLong']}","${setup['entityPropLat']}"]},"mapStyle":"LIGHT","points":[{"point":["${setup['entityPropLong']}","${setup['entityPropLat']}"],"key":"${setup['entityID']}:Address","title":"Address","element":{"id":"${setup['entityID']}","typename":"location","raw":{"id":"${setup['entityID']}","label":"location","type":"Entity","properties":${setup['entityProps']}}}}]}},"artifactId":"${artifactID}"},"query":"mutation ($artifactId: String!, $event: EventInput!) {\\n  pushEvent(artifactId: $artifactId, event: $event)\\n}\\n"}]`
    res = http.post(
        `${setup['baseURL']}/api/workspaces/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(10)
    check(res, {
        'Add searched entity to map status is 200': (r) => r.status === 200,
    })

    check(res, {
        'status is 200': (r) => r.status === 200,
    })
}