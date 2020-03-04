// Copyright 2018 IBM Corp. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

var galleryController = function(title) {

    var aws = require('ibm-cos-sdk');
    var multer = require('multer');
    var multerS3 = require('multer-s3');
    var ep = new aws.Endpoint('s3.us-south.cloud-object-storage.appdomain.cloud');
    var s3 = new aws.S3({endpoint: ep, region: 'us-south'});
    var myBucket = 'my-bucket-webgallery';

    //const keys = require('~/.bluemix' + '/cos_credentials');
    //aws.config.update({"accessKeyId": "a03ba2f126044de38916a5beb30dad1c", "secretAccessKey": "d9428cb3f779881d8940d1b467612480406cd748f2dcc080", "region": "us-south"});

    var upload = multer({
        storage: multerS3({
            s3: s3,
            bucket: myBucket,
            key: function (req, file, cb) {
                cb(null, file.originalname);
                console.log(file);
            }
        })
    });

    var getGalleryImages = function (req, res) {
        var imageUrlList = [];


        var params = {Bucket: myBucket};
        console.log('Start getting images from bucket');
        s3.listObjects(params, function (err, data) {
            if(data) {
                var bucketContents = data.Contents;

                for (var i = 0; i < bucketContents.length; i++) {
                    if(bucketContents[i].Key.search(/.jpg/i) > -1) {
                        console.log('received images');
                        var urlParams = {Bucket: myBucket, Key: bucketContents[i].Key};

                        //getting url, Pre-signing a getObject operation (synchronously)
                        var url = s3.getSignedUrl('getObject', urlParams);
                        console.log('The URL is', url);
                        imageUrlList[i] = url;
                        // s3.getSignedUrl('getObject', urlParams, function (err, url) {
                        //     imageUrlList[i] = url;
                        //     console.log(imageUrlList.length);
                        // });
                    }
                }
            }
            res.render('galleryViewS2', {
                title: title,
                imageUrls: imageUrlList
            });
        });
    };


    return {
        getGalleryImages: getGalleryImages,
        upload: upload
    };
};

module.exports = galleryController;
