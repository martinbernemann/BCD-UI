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
<!--
  This stylesheet offers a utility function for formatting numbers in a wrs
  document. It is used by various stylesheets working with the wrs format like
  "htmlBuilder.xslt"

 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <!--
      This template formats a number according to the rules specified by the wrs column
      definition an cell overrides.
      Global param:
      decimalFormatName: 'enDecimalFormat' or 'deDecimalFormat', default is 'enDecimalFormat'
      Template param:
      value: the value, if not given the current context node is used
    -->
  <xsl:param name="bcdI18nModel" select="*[false()]"/>

  <xsl:variable name="defaultDecimalFormatNameI18n" select="$bcdI18nModel/*/bcd_DecimalFormat"/>
  <xsl:variable name="defaultDecimalFormatName">
    <xsl:choose>
      <xsl:when test="$defaultDecimalFormatNameI18n"><xsl:value-of select="$defaultDecimalFormatNameI18n"/></xsl:when>
      <xsl:otherwise>enDecimalFormat</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="defaultFormattingPattern">
    <xsl:choose>
      <xsl:when test="$defaultDecimalFormatName='enDecimalFormat'">#,##0.</xsl:when>
      <xsl:when test="$defaultDecimalFormatName='deDecimalFormat'">#.##0,</xsl:when>
      <xsl:otherwise>#,##0.</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="defaultFormattingPatternInteger">
    <xsl:choose>
      <xsl:when test="$defaultDecimalFormatName='enDecimalFormat'">#,##0</xsl:when>
      <xsl:when test="$defaultDecimalFormatName='deDecimalFormat'">#.##0</xsl:when>
      <xsl:otherwise>#,##0</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:decimal-format name="enDecimalFormat" NaN="" infinity="" digit="#" decimal-separator="." grouping-separator="," pattern-separator="|"/>
  <xsl:decimal-format name="deDecimalFormat" NaN="" infinity="" digit="#" decimal-separator="," grouping-separator="." pattern-separator="|"/>

  <xsl:key name="columnHeaderByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:template name="formatNumber">
    <xsl:param name="columnDefinition" select="*[1=0]"/>
    <xsl:param name="value" select="."/>
    <xsl:param name="unit"/>
    <xsl:param name="scale"/>
    <xsl:param name="average" select="false()"/>
    <!-- standard or accounting -->
    <xsl:param name="numberFormattingOption" select="'standard'"/>

    <xsl:variable name="effectiveUnit">
      <xsl:choose>
        <xsl:when test="$unit">
          <xsl:value-of select="$unit"/>
        </xsl:when>
        <xsl:when test="@unit">
          <xsl:value-of select="@unit"/>
        </xsl:when>
        <xsl:when test="$columnDefinition/@unit">
          <xsl:value-of select="$columnDefinition/@unit"/>
        </xsl:when>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="percentUnit">
      <xsl:if test="$effectiveUnit='%'">%</xsl:if>
    </xsl:variable>
    <xsl:variable name="nonPercentUnit">
      <xsl:if test="string-length($effectiveUnit)>0 and $effectiveUnit!='%'">
        <!-- we delay this parsing as long as possible and parse only once. that's why it is nested, not added to test above -->
        <xsl:variable name="valueNum" select="number($value)"/>
        <xsl:if test="$valueNum=$valueNum">
          <xsl:value-of select="concat(' ',$effectiveUnit)"/>
        </xsl:if>
      </xsl:if>
    </xsl:variable>

    <xsl:variable name="numberDigits">
      <xsl:if test="$average">
        <xsl:variable name="valueNum" select="number($value)"/>
        <xsl:choose>
          <xsl:when test="$valueNum >= 1000000000">9</xsl:when>
          <xsl:when test="$valueNum >= 1000000">6</xsl:when>
          <xsl:when test="$valueNum >= 1000">3</xsl:when>
        </xsl:choose>
      </xsl:if>
    </xsl:variable>

    <xsl:variable name="numberAbbrev">
      <xsl:choose>
        <xsl:when test="$numberDigits = 9">b</xsl:when>
        <xsl:when test="$numberDigits = 6">m</xsl:when>
        <xsl:when test="$numberDigits = 3">k</xsl:when>
      </xsl:choose>
    </xsl:variable>

    <xsl:variable name="downScale">
      <xsl:choose>
        <xsl:when test="$numberDigits = 9">1000000000</xsl:when>
        <xsl:when test="$numberDigits = 6">1000000</xsl:when>
        <xsl:when test="$numberDigits = 3">1000</xsl:when>
        <xsl:otherwise>1</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <!-- Scale defines the shown precision.
         If abs(scale) is less than 10, it gives the decimal digits. If positive, trailing 0 are preserved.
         If it is greater it is rounded to the nearest multiple of scale. If positive, trailing 0 are preserved. Negative here is only allowed for 10 pow n.
         Sample (in US format) for 14990.404: scale 2 -> 14990.40, scale -2 -> 14990.4, scale 1000 -> 15,000, scale -1000 -> 15
         (Implementation note, we cannot use shorter number(@scale|$columnDefinition/@scale) because document order is wrong priority order)
     -->
    <xsl:variable name="effectiveScale">
      <xsl:choose>
        <xsl:when test="$scale">
          <xsl:value-of select="$scale"/>
        </xsl:when>
        <xsl:when test="@scale">
          <xsl:value-of select="@scale"/>
        </xsl:when>
        <xsl:when test="$columnDefinition/@scale">
          <xsl:value-of select="$columnDefinition/@scale"/>
        </xsl:when>
      </xsl:choose>
    </xsl:variable>

    <xsl:choose>
      <xsl:when test="$effectiveScale > 10">
        <xsl:call-template name="formatNumberImpl">
          <xsl:with-param name="value" select="round($value div $effectiveScale) * $effectiveScale"/>
          <xsl:with-param name="pattern" select="concat($defaultFormattingPatternInteger, $percentUnit)"/>
          <xsl:with-param name="suffix" select="$nonPercentUnit"/>
          <xsl:with-param name="numberFormattingOption" select="$numberFormattingOption"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="$effectiveScale &lt; -10">
        <xsl:call-template name="formatNumberImpl">
          <xsl:with-param name="value" select="round($value div $effectiveScale) * -1"/>
          <xsl:with-param name="pattern" select="concat($defaultFormattingPatternInteger, $percentUnit)"/>
          <xsl:with-param name="suffix" select="$nonPercentUnit"/>
          <xsl:with-param name="numberFormattingOption" select="$numberFormattingOption"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="$effectiveScale > 0">
        <xsl:call-template name="formatNumberImpl">
          <xsl:with-param name="value" select="$value div $downScale"/>
          <xsl:with-param name="pattern" select="concat($defaultFormattingPattern, substring('000000000000000000000000000000000000000', 1, $effectiveScale), $percentUnit)"/>
          <xsl:with-param name="suffix" select="concat($numberAbbrev, $nonPercentUnit)"/>
          <xsl:with-param name="numberFormattingOption" select="$numberFormattingOption"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="$effectiveScale &lt; 0">
        <xsl:call-template name="formatNumberImpl">
          <xsl:with-param name="value" select="$value div $downScale"/>
          <xsl:with-param name="pattern" select="concat($defaultFormattingPattern, substring('#######################################', 1, -1*$effectiveScale), $percentUnit)"/>
          <xsl:with-param name="suffix" select="concat($numberAbbrev, $nonPercentUnit)"/>
          <xsl:with-param name="numberFormattingOption" select="$numberFormattingOption"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:call-template name="formatNumberImpl">
          <xsl:with-param name="value" select="$value div $downScale"/>
          <xsl:with-param name="pattern" select="concat($defaultFormattingPatternInteger,$percentUnit)"/>
          <xsl:with-param name="suffix" select="concat($numberAbbrev, $nonPercentUnit)"/>
          <xsl:with-param name="numberFormattingOption" select="$numberFormattingOption"/>
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <!-- implementation of number formatting including negative format option -->
  <xsl:template name="formatNumberImpl">
  <xsl:param name="value"/>
  <xsl:param name="pattern"/>
  <xsl:param name="suffix"/>
  <xsl:param name="numberFormattingOption"/>
  <xsl:param name="formatName" select="$defaultDecimalFormatName"/>
  <xsl:choose>
    <xsl:when test="$numberFormattingOption = 'accounting'">
      <xsl:value-of select="concat(format-number($value, concat($pattern,'|(',$pattern,')'), $formatName), $suffix)"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="concat(format-number($value, $pattern, $formatName), $suffix)"/>
    </xsl:otherwise>
  </xsl:choose>
  </xsl:template>

</xsl:stylesheet>
