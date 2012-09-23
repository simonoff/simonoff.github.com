---
layout: post
title: "Easy way to secure column in database with Rails 3"
date: 2012-05-19 19:48
comments: true
categories: [Rails, secure]
---

In my current project I need to store crypted data to the column in database.
I found a few projects on [Ruby Toolbox](https://www.ruby-toolbox.com/categories/encryption) for this.
But main issues of this projects is:

- They are too big
- They are not maintained
- They are not customizable

So I found better solution for me. 

<!-- more -->

As you know ActiveRecord can serialize any column. ActiveRecord uses Marshal to serialize column by default. But we can change it to using any custom serialization class. Main requirements of this custom class is to have `load` and `dump` methods.

I think my example will helps you to decrease time of you development.

``` ruby Example of custom serialization class
class Example < ActiveRecord::Base    
  class Encryptor
    def initialize(default = '')
      @default = default
    end
  
    def cipher
      # You can use any two ways encryption ruby gem for this
      # I'm used gibberish bacause it very usable for me
      @cipher ||= ::Gibberish::AES.new('p@ssw0rd')
    end
  
    def load(s)
      s.present? ? cipher.dec(s) : @default.clone
    end
  
    def dump(s)
      cipher.enc(s || @default)
    end   
  end
  
  serialize :key, Encryptor.new('')
end
```