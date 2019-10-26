---
title: Categories
subtitle: ""
layout: default
---

{% for category in site.categories %}
<h2 id="{{ category[0] | strip }}">{{ category[0] }}</h2>
<ul>
	{% for post in category[1] %}
	<li>
		<a href="{{ post.url }}">{{ post.title }}</a>
	</li>
	{% endfor %}
</ul>
{% endfor %}