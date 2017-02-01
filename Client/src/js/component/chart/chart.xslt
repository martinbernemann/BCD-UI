<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:import href="chartTemplate.xslt"/>

<xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

<xsl:param name="id"/>
<xsl:param name="metaDataModel"/>
<xsl:param name="targetHTMLElementId"/>

<xsl:template match="/*">
  <xsl:call-template name="chart">
    <xsl:with-param name="id" select="$id"/>
    <xsl:with-param name="metaDataModel" select="$metaDataModel"/>
    <xsl:with-param name="targetHTMLElementId" select="$targetHTMLElementId"/>
  </xsl:call-template>
</xsl:template>

</xsl:stylesheet>
