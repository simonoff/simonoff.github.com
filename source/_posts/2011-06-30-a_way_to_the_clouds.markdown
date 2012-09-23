---
layout: post
title: A Way To The Clouds
date: 2011-06-30 22:24:27
comments: true
categories: [Rails, Amazon S3, jammit]
---
![picture alt](/images/clouds.jpg "Clouds") 

Every project after launch begin to think about millions users and billions requests. But every time developers has a restrictions on hardware power to accept this billions requests. Because each request to server must be doing something useful we need clean our web server from requests to static files like images, JavaScript, CSS, etc.

<!-- more -->

We have two ways to do it - use separate web server for static files or use Content Delivery Networks. Each way has an issues. Separate web server has additional fees for setup, administration, supporting. And in this way we need additional servers for replying on requests to static files as fast as we can. But this way give to us full control under our data storage and headers what we will send to the browser. CDN has additional fees only for traffic and data storage. And our static files will be sent to browser very fast. But we cannot control which headers will be sent to our clients. I will show you how to fix some issues with headers.
So our project has chosen CDN. We use Amazon EC2 so we has chosen Amazon CloudFront.

But we still have another issue with our static files. They are too big. I mean JS and CSS. So we need compress they. There is two way to do it. 
Compress by archivator or obfuscate code of JS and CSS. 

With obfuscate we will have big trouble - DEBUG! How we can debug the code from browser when we get error in first line on 3456 char with trace like **undefined variable in function a(c) { var d = c.split("/"); return d\[0\];}**? What mean **function b**? We know only **function first_element_of_path**. So this is a broken way for now. 

With compressing with archivator we will have only one issue - IE 6 not supporting gzip compressed files.

We don't want debug hell. We not support IE6. So we has chosen gzip.

Ok, so we will begin the party! 
I will tell you how we made our static files speedy and didn't got debug hell.

First of all we must concatenate all ours JS files into one big JS file and all CSS files into one. We can do this with Jummit Ruby gem. This gem is an industrial strength asset packaging library for Rails, providing both the CSS and JavaScript concatenation and compression. You can find documentation and examples of using of this gem on his home page.

For Rails 3 simply add next line into our Gemfile:
``` ruby
gem 'jammit'
```

After create config/assets.yml file for Jammit:
``` yaml
embed_assets: off 
package_assets: on 
compress_assets: off 
allow_debugging: on 
javascripts:
  application:
    - public/javascripts/jquery-1.4.2.js 
    - public/javascripts/application1.js 
    - public/javascripts/application2.js
stylesheets: 
  application:
  - public/stylesheets/main.css
  - public/stylesheets/additional1.css 
  - public/stylesheets/additional2.css 
  - public/stylesheets/additional3.css 
  - public/stylesheets/additional4.css 
  - public/stylesheets/additional5.css
```

As you see we disabled compressing by Yahoo YUI Compressor and Google Closure Compiler. And we allowed debugging to load the page with uncompressed and unpackaged JS and CSS in production. Gzipping of JS and CSS enabled by default in Jammit. So all steps to start using CDN we did.

Amazon CloudFront can use Amazon S3 and your separate server for getting the static files. Our project has chosen Amazon S3 for storing static files and now we need upload ours JS and CSS compressed files to S3. It's very simple. We will use extension to Jammit - jammit-s3 Ruby gem. You can find this extension on GitHub. We open our Gemfile again and replace jammit with jammit-s3. Jammit S3 already has a gem dependency for jammit. 
And we need add S3 settings to our config/ assets.yml file:
``` yaml
s3_access_key_id: "Put here our S3 access key"
s3_secret_access_key: "Put here your S3 secret key"
s3_bucket: "Put your S3 bucket for static files here"
s3_cache_control: 'public,max-age=31536000'
s3_upload_files:
  - public/fonts/**
  - public/sounds/**
  - public/swf/**
  - public/javascripts/**/*
use_cloudfront: on
cloudfront_dist_id: XXXXXXXXXXXXXX
```

By default, jammit-s3 will upload your configured asset directly, along with **public/images**. However you can customize this using the **s3_upload_files** setting, which should be a list of file globs. In our case we will upload to S3 all fonts, music, flash and JS. By **use\_cloudfront** and **cloudfront\_dist\_id** settings we enable supporting of CloudFront. Please note that **cloudfront\_dist\_id** is not the same as the CloudFront domain name. Inside CloudFront management console select the distribution, and you will see Distribution ID value. Additionaly you can set **cloudfront\_domain** option and Rails will use the CloudFront domain name for your assets instead of serving them from the (slow) S3 bucket. But we have different domains for assets for each of our partners and we did it in another way.

So you can add new task to your capistrano to make and upload your JS and CSS files:
``` ruby
desc "Make new jammit assets and upload to S3" 
task :jammit do
  run "cd #{current_path}; bundle exec jammit"
  run "cd #{current_path}; bundle exec jammit-s3" 
end
before "deploy:restart", "deploy:jammit"
```

But Jammit gem has a two issues:

* not supporting CSS @import directive and￼you need write your import files as a dependences in assets.yml by hand 
* paperclip's aws-s3 gem dependence for S3 storage. Paperclip can be fixed by extra file from S3 gem.

And in this simple Capistrano task we have an issues with CloudFront invalidation requests.

##Known issues with CloudFront invalidation requests:
1. It may reportedly take up to 15 minutes to invalidate all the CloudFront caches around the globe (and Amazon charges for more than a certain number of invalidations per month).
2. It's non-atomic from the perspective of the end-user: They may get an older version of the site with a newer version of the JavaScript and CSS, or vice versa.
3. It doesn't play nicely with aggressive HTTP caching. For example, once I serve a script or a stylesheet, I would like it to be cached indefinitely with no more round trips to see whether it is valid.

Now I will show you how to fix CloudFront invalidation issues. We use subdir with release name in assets to avoid getting old JS and CSS files after deploy. In this way we can support old and new clients in the same time. I will show you piece of our Capistrano tasks:
``` ruby
#!/usr/bin/env ruby
unless Capistrano::Configuration.respond_to?(:instance) 
  abort "This extension requires Capistrano 2"
end 
Capistrano::Configuration.instance.load do
  namespace :s3 do
    desc "Creates the s3.yml configuration file in shared path."
    task :setup, :except => { :no_release => true } do
      opts = fetch(:s3_opts)
      send_config_to_server("s3.yml","",opts) 
    end
    
    desc <<-DESC
      [internal] Updates the symlink for s3.yml file to the just deployed release.
    DESC
    task :symlink, :except => { :no_release => true } do￼￼￼￼￼
      setup
      make_symlink_on_server("s3.yml") 
    end
    
    desc "set correct bucket name into assets.yml" 
    task :correct_assets_yml do
      opts = fetch(:s3_opts)
      run "echo \"s3_bucket: '#{opts["bucket"]}'\" >> #{release_path}/config/assets.yml"
      run "echo \"use_cloudfront: true\" >> #{release_path}/config/assets.yml"
      run "echo \"cloudfront_dist_id: '#{opts["cloudfront_dist_id"]}'\" >> #{release_path}/config/assets.yml"
    end
    
    desc "Make new jammit assets path based on commit hash" 
    task :jammit do
      run "echo \"package_path: 'assets/#{release_name}'\" >> #{current_path}/config/assets.yml"
      run "mkdir -p #{release_path}/public/assets/#{release_name}" 
      run "cd #{current_path}; bundle exec jammit"
      run "cd #{current_path}; bundle exec jammit-s3"
    end 
  end
  
  after "deploy:setup", "s3:setup" unless fetch(:skip_s3_setup, false)
  after "deploy:finalize_update", "s3:symlink", "s3:correct_assets_yml"
  before "deploy:restart", "s3:jammit"
end
```

I has contributed to the Jammit S3. I has fixed issues with broken API version and with sending invalidation requests on each entry in **s3\_upload\_files** config section. Now Jammit S3 will send invalidation request only after uploading all files to S3.

Issue what I cannot fix is a how FF works with @font-face directives in CSS file. FF by default load fonts only from origin domain. To fix this issue we must
send **Access-Control-Allow-Origin: your_domain** header to the FF. But Amazon S3 don’t support this header. So we load font from your main domain. May be in the future Amazon will add this header to the S3.
