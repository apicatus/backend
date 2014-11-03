#!/bin/sh

echo "INDICES"
#curl -XGET 'localhost:9200/_cat/indices?v'
echo "MAPPINGS"
#curl -XGET 'http://localhost:9200/logs/_mapping/log?pretty' 
echo "REMOVE INDICES"
#curl -XDELETE 'http://localhost:9200/logs/' # remove all logs
echo "CREATE INDICE"
#curl -XPOST 'localhost:9200/logs?pretty'
echo "CREATE MAPPING"
#curl -XPOST 'localhost:9200/logs/_mapping/log?pretty' -d @models/logs.mapping.json
function call {
    UAS="User-Agent: "$(head -$((${RANDOM} % `wc -l < uas.txt` + 1)) uas.txt | tail -1)
    ORG="Origin: http://miapi.com:8070"
    ENC="Accept-Encoding: gzip,deflate"
    LAN="Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4"
    CON="Connection: keep-alive"
    ACC="Accept: */*"
    REF="Referer: http://miapi.com:8070/"
    curl -s -o /dev/null -w "%{http_code}" $1 -H $ORG -H $ENC -H $LAN -H $UAS -H $ACC -H $REF -H $CON --compressed  ; echo 
    exit
}
while [ true ]
do
    SLEEP=$(echo $RANDOM % 10 + 1 | bc)
    MOVIE=$(head -$((${RANDOM} % `wc -l < movies.names` + 1)) movies.names | tail -1)
    UAS=$(head -$((${RANDOM} % `wc -l < uas.txt` + 1)) uas.txt | tail -1)
    CITY=$(head -$((${RANDOM} % `wc -l < top5000Population.csv` + 1)) top5000Population.csv | tail -1 | awk -F',' '{print $1}')
    VAL=$(echo $RANDOM % 10 + 1 | bc)
    if [ $VAL -gt 5 ]
    then
        echo "more: TRY FAIL"
        curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/more' -X POST -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --data 'xx=11' --compressed  ; echo 
        echo "WEATHER"
        #curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/max?q='$CITY -X GET -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed  ; echo 
    else
        echo "more: TRY GOOD"
        curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/more' -X POST -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' -H 'Content-Length: 0' --compressed  ; echo 
    fi
    echo "WEATHER"
    curl -s -o /dev/null -w "%{http_code}" 'http://myapi.miapi.com:8070/max?q='$CITY -X GET -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed  ; echo 
    echo "moviedb"
    curl -s -o /dev/null -w "%{http_code}" 'http://mymovies.miapi.com:8070/?i=&t='$MOVIE -X GET -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' -H 'If-Modified-Since: Thu, 30 Oct 2014 11:57:18 GMT' --compressed  ; echo 
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
}'

curl -XGET 'http://localhost:9200/logs/log/_search?pretty' -d '{"query":{"match_all":{}},"facets":{"535b97317899a672c49dd48c":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:535b97317899a672c49dd48c"}}}},{"exists":{"field":"status"}}]}}}}}}},"535b97507899a672c49dd490":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:535b97507899a672c49dd490"}}}},{"exists":{"field":"status"}}]}}}}}}},"53675d123419d5000089a424":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:53675d123419d5000089a424"}}}},{"exists":{"field":"status"}}]}}}}}}},"5367601f3419d5000089a42b":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5367601f3419d5000089a42b"}}}},{"exists":{"field":"status"}}]}}}}}}},"5367605b3419d5000089a42c":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5367605b3419d5000089a42c"}}}},{"exists":{"field":"status"}}]}}}}}}},"53676480a38da000008fb351":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:53676480a38da000008fb351"}}}},{"exists":{"field":"status"}}]}}}}}}},"5442f6b0a3e83d0000e589ec":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5442f6b0a3e83d0000e589ec"}}}},{"exists":{"field":"status"}}]}}}}}}},"54442e2596663e00b9b2e0e1":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:54442e2596663e00b9b2e0e1"}}}},{"exists":{"field":"status"}}]}}}}}}},"54446f758a87300000403eee":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:54446f758a87300000403eee"}}}},{"exists":{"field":"status"}}]}}}}}}},"54446fba8a87300000403ef3":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:54446fba8a87300000403ef3"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444a7488a87300000403f0b":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444a7488a87300000403f0b"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444a8018a87300000403f0d":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444a8018a87300000403f0d"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444a8318a87300000403f12":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444a8318a87300000403f12"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444a8638a87300000403f17":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444a8638a87300000403f17"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444a8a58a87300000403f1c":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444a8a58a87300000403f1c"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444b3918a87300000403f25":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444b3918a87300000403f25"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444b5128a87300000403f2b":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444b5128a87300000403f2b"}}}},{"exists":{"field":"status"}}]}}}}}}},"5444b5638a87300000403f33":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:5444b5638a87300000403f33"}}}},{"exists":{"field":"status"}}]}}}}}}},"54522386128dfd00006dfa49":{"date_histogram":{"key_field":"date","value_field":"time","interval":"1d"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"filter":{"bool":{"must":[{"range":{"date":{"from":1414195484403,"to":1414800284403}}},{"fquery":{"query":{"query_string":{"query":"digestor:54522386128dfd00006dfa49"}}}},{"exists":{"field":"status"}}]}}}}}}}}}'

curl 'http://localhost:9200/_all/_search?search_type=count' -H 'Origin: http://localhost:7700' -H 'Accept-Encoding: gzip,deflate' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Content-Type: application/json;charset=UTF-8' -H 'Accept: application/json, text/plain, */*' -H 'Referer: http://localhost:7700/index.html' -H 'Connection: keep-alive' --data-binary '{"facets":{"0":{"date_histogram":{"field":"date","interval":"1s"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"status=200"}},"filter":{"bool":{"must":[{"range":{"date":{"from":1414557582359,"to":1414557882359}}},{"exists":{"field":"status"}}]}}}}}}},"1":{"date_histogram":{"field":"date","interval":"1s"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"status=400"}},"filter":{"bool":{"must":[{"range":{"date":{"from":1414557582359,"to":1414557882359}}},{"exists":{"field":"status"}}]}}}}}}},"2":{"date_histogram":{"field":"date","interval":"1s"},"global":true,"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"status=500"}},"filter":{"bool":{"must":[{"range":{"date":{"from":1414557582359,"to":1414557882359}}},{"exists":{"field":"status"}}]}}}}}}}},"size":0}' --compressed


















