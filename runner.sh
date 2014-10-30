#!/bin/sh

echo "INDICES"
curl -XGET 'localhost:9200/_cat/indices?v'
echo "MAPPINGS"
curl -XGET 'http://localhost:9200/logs/_mapping/log?pretty' 
echo "REMOVE INDICES"
#curl -XDELETE 'http://localhost:9200/logs/' # remove all logs
echo "CREATE INDICE"
curl -XPOST 'localhost:9200/logs?pretty'
echo "CREATE MAPPING"
curl -XPOST 'localhost:9200/logs/_mapping/log?pretty' -d @models/logs.mapping.json
while [ true ]
do
    VAL=$(echo $RANDOM % 10 + 1 | bc)
    SLEEP=$(echo $RANDOM % 10 + 1 | bc)
    if [ $VAL -gt 5 ]
    then
        echo "more: TRY FAIL"
        curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/more' -X POST -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --data 'xx=11' --compressed  ; echo 
    else
        echo "more: TRY GOOD"
        curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/more' -X POST -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' -H 'Content-Length: 0' --compressed   ; echo 
    fi
    #curl curl 'http://myapi.miapi.com:8080/foo' -H 'Origin: http://miapi.com:8080' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8080/' -H 'Connection: keep-alive' --compressed
    echo "echoed"
    curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/echoed' -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed  ; echo 
    echo "status"
    curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/status' -H 'x-forwarded-for: 190.18.149.180' -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed ; echo 
    echo "foo"
    curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/foo' -H 'x-forwarded-for: 190.18.149.180' -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed ; echo 
    #curl 'http://myapi.miapi.com:8070/more' -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --data 'xx=123' --compressed
    sleep $SLEEP
done


curl -XGET 'http://localhost:9200/logs/log/_search?pretty' -d '
{
    "query": {
        "filtered" : { 
            "filter": { 
                "range" : { 
                    date: {
                        from: 1414560000000,
                        to: 1414560300000
                    }
                } 
            } 
        }
    },
    "post_filter": {    
        "term" : {
            "staus" : "500"
        }
    },
    "aggregations": {
        "dates_with_holes": {
            "date_histogram": {
                "field": "date",
                "interval": "minute",
                "min_doc_count": 0,
                "extended_bounds": {
                    "min": 1414560000000,
                    "max": 1414560300000
                }
            }
        },
        aggregations: {
            bucket_stats: {
                stats: {
                    field: "status"
                }
            }
        }
    }
}
'
#estadisticas para status
curl -XGET 'http://localhost:9200/logs/log/_search?pretty' -d '
{
    "query": {
        "filtered" : { 
            "filter": { 
                "bool": {
                    "must": [{
                        "range" : { 
                            date: {
                                from: 1414571611122,
                                to: 1414571634566
                            }
                        }
                    },
                    {
                        "fquery": {
                            "query": {
                                "query_string": {
                                    "query": "digestor:535b97507899a672c49dd490"
                                }
                            },
                            "_cache": true
                        }
                    },
                    {
                        "fquery": {
                            "query": {
                                "query_string": {
                                    "query": "status:500"
                                }
                            },
                            "_cache": true
                        }
                    }]
                }
            } 
        }
    },
    "aggregations": {
        "dates_with_holes": {
            "date_histogram": {
                "field": "date",
                "interval": "1m",
                "min_doc_count": 0,
                "extended_bounds": {
                    "min": 1414571611122,
                    "max": 1414571634566
                }
            },
            "aggregations": {
                "time_stats": {
                    "stats": {
                        field: "status"
                    }
                }
            }
        }
    }
}
'
#estadisticas histograficas x timepo
curl -XGET 'http://localhost:9200/logs/log/_search?pretty' -d '
{
    "query": {
        "filtered" : { 
            "filter": { 
                "bool": {
                    "must": [{
                        "range" : { 
                            date: {
                                from: 1414568263427,
                                to: 1414571888233
                            }
                        }
                    },
                    {
                        "fquery": {
                            "query": {
                                "query_string": {
                                    "query": "digestor:535b97507899a672c49dd490"
                                }
                            },
                            "_cache": true
                        }
                    }]
                }
            } 
        }
    },
    "aggregations": {
        "dates_with_holes": {
            "date_histogram": {
                "field": "date",
                "interval": "1m",
                "min_doc_count": 0,
                "extended_bounds": {
                    "min": 1414568263427,
                    "max": 1414571888233
                }
            },
            "aggregations": {
                "time_percentiles": {
                    "percentiles": {
                        field: "time"
                    }
                },
                "time_stats": {
                    "stats": {
                        field: "time"
                    }
                }
            }
        }
    }
}
'

#aggregates transfer ALL
curl -XGET 'http://localhost:9200/logs/log/_search?pretty' -d '
{
    "query": {
        "filtered" : { 
            "filter": { 
                "bool": {
                    "must": [{
                        "range" : { 
                            date: {
                                from: 1414568263427,
                                to: 1414571888233
                            }
                        }
                    },
                    {
                        "fquery": {
                            "query": {
                                "query_string": {
                                    "query": "digestor:535b97507899a672c49dd490"
                                }
                            },
                            "_cache": true
                        }
                    }]
                }
            } 
        }
    },
    "aggregations": {
        "transfer_statistics": {
            "extended_stats": {
                "field": "responseHeaders.content-length"
            }
        }
    }
}
'
# AGGE transfers histogram
curl -XGET 'http://localhost:9200/logs/log/_search?pretty' -d '
{
    "query": {
        "filtered" : { 
            "filter": { 
                "bool": {
                    "must": [{
                        "range" : { 
                            date: {
                                from: 1414568263427,
                                to: 1414571888233
                            }
                        }
                    },
                    {
                        "fquery": {
                            "query": {
                                "query_string": {
                                    "query": "digestor:535b97507899a672c49dd490"
                                }
                            },
                            "_cache": true
                        }
                    }]
                }
            } 
        }
    },
    "aggregations": {
        "dates_with_holes": {
            "date_histogram": {
                "field": "date",
                "interval": "1m",
                "min_doc_count": 0,
                "extended_bounds": {
                    "min": 1414568263427,
                    "max": 1414571888233
                }
            },
            "aggregations": {
                "time_percentiles": {
                    "percentiles": {
                        field: "responseHeaders.content-length"
                    }
                },
                "time_stats": {
                    "stats": {
                        field: "responseHeaders.content-length"
                    }
                }
            }
        },
        "transfer_statistics": {
            "extended_stats": {
                "field": "responseHeaders.content-length"
            }
        }
    }
}
'

# Get countries
curl -XGET 'http://localhost:9200/logs/log/_search?pretty' -d '
{
    "query": {
        "filtered" : { 
            "filter": { 
                "bool": {
                    "must": [{
                        "range" : { 
                            date: {
                                from: 1414568263427,
                                to: 1414571888233
                            }
                        }
                    },
                    {
                        "fquery": {
                            "query": {
                                "query_string": {
                                    "query": "digestor:535b97507899a672c49dd490"
                                }
                            },
                            "_cache": true
                        }
                    }]
                }
            } 
        }
    },
    "facets": {
        "map": {
            "terms": {
                "field": "geo.country",
                "size": 100,
                "exclude": []
            }
        }
    }
}
'

curl 'http://localhost:9200/_all/_search?search_type=count' -H 'Origin: http://localhost:7700' -H 'Accept-Encoding: gzip,deflate' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Content-Type: application/json;charset=UTF-8' -H 'Accept: application/json, text/plain, */*' -H 'Referer: http://localhost:7700/index.html' -H 'Connection: keep-alive' --data-binary '{"facets":{"0":{"date_histogram":{"field":"date","interval":"1s"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"status=200"}},"filter":{"bool":{"must":[{"range":{"date":{"from":1414557582359,"to":1414557882359}}},{"exists":{"field":"status"}}]}}}}}}},"1":{"date_histogram":{"field":"date","interval":"1s"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"status=400"}},"filter":{"bool":{"must":[{"range":{"date":{"from":1414557582359,"to":1414557882359}}},{"exists":{"field":"status"}}]}}}}}}},"2":{"date_histogram":{"field":"date","interval":"1s"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"status=500"}},"filter":{"bool":{"must":[{"range":{"date":{"from":1414557582359,"to":1414557882359}}},{"exists":{"field":"status"}}]}}}}}}}},"size":0}' --compressed