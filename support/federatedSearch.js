const urlFederatedSearch = '/api/search/federated'

export function searchAllEntities(token) {
    return (session.post(urlFederatedSearch,
        getSearchPayload("*"),
        { headers: getSearchHeader(token) }
    ));
}

export function searchSingleEntity(token, value) {
    return (session.post(urlFederatedSearch,
        getSearchPayload(value),
        { headers: getSearchHeader(token) }
    ));
}

function getSearchPayload(value) {
    return (JSON.stringify(
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
                    "values": [`${value}`],
                    "matchType": "text"
                    }
                ],
                "operator": "AND"
                }
            ],
            "operator": "AND"
            }
        }
    ));
}

function getSearchHeader(token) {
    return (
        { 
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8" 
        }
    );
}