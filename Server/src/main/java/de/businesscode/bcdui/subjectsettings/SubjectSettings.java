/*
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
*/
package de.businesscode.bcdui.subjectsettings;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.Unmarshaller;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;

import org.apache.log4j.Logger;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType;
import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;

/**
 * Subject settings are session settings in web and non-web environments
 * It covers rights, i18n settings and so on
 */
@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "SubjectSettingsConfig")
@XmlRootElement(name = "SubjectSettingsConfig", namespace="http://www.businesscode.de/schema/bcdui/subjectsettings-1.0.0")
public class SubjectSettings extends SubjectSettingsConfig {

  public static final String permissionAttributePrefix = "permission:";

  private static SubjectSettings singelton = null;
  private static final Logger log = Logger.getLogger(SubjectSettings.class);
  private Map<String,SubjectFilterType> subjectFilterTypeMap = null;
  private static boolean rightsInDbAvailable = true;
  private static Lock initLock = new ReentrantLock(true);
  private static Lock lookupLock = new ReentrantLock(true);

  /**
   * if subjectsettings was configured by project or we just have a hollow instance
   */
  private boolean wasConfigured = false;

  /**
   * @return TRUE if this instance was configured by host project is is hollow instance
   */
  public boolean isWasConfigured() {
    return wasConfigured;
  }

  public final static SubjectSettings getInstance()
  {
    if( singelton==null ) {
      initLock.lock();
      try{
        if(singelton==null){
          String confPath = (String)BareConfiguration.getInstance().getConfigurationParameterOrNull(Configuration.CONFIG_FILE_PATH_KEY);
          if(confPath == null){
            singelton = new SubjectSettings();
          }else{
            try {
              FileInputStream file = new FileInputStream(confPath+File.separator+"subjectSettings.xml");
              JAXBContext jc = JAXBContext.newInstance( SubjectSettings.class );
              Unmarshaller u = jc.createUnmarshaller();
              SubjectSettings s = (SubjectSettings)u.unmarshal( file );
              file.close();
              s.wasConfigured=true;

              singelton = s;
              // early init of the map here in same thread while stream is open
              singelton.getSubjectFilterTypeByName("");

              // Now let's check whether bcd_sec_user_settings is available.
              // If not, subject attributes set in realm, may still be used for subject settings
              try {
                Collection<String> c = new LinkedList<String>();
                c.add("user_id");
                Bindings.getInstance().get("bcd_sec_user_settings",c);
              } catch (BindingException e) {
                rightsInDbAvailable = false; // Not an error but a negative test result
              }
            } catch (Exception e) {
              if(e instanceof FileNotFoundException){
                log.info("No SubjectSettings subjectSettings.xml found in init path - disable subjectSettings");
              }else{
                log.error("Disable subjectSettings, due to exception during initialization", e);
              }
              singelton = new SubjectSettings();
            }
          }
        }
      }finally{
        initLock.unlock();
      }
    }
    return singelton;
  }

  public SubjectFilterType getSubjectFilterTypeByName( String type )
  {
    if( subjectFilterTypeMap==null ) {
      lookupLock.lock();
      try{
        if(subjectFilterTypeMap==null){
          subjectFilterTypeMap = new HashMap<String,SubjectFilterType>();
          SubjectFilterTypes types = getSubjectFilterTypes();
          if(types != null){
            List<SubjectFilterType> sfL = types.getSubjectFilterType();
            if(sfL != null){
              for (SubjectFilterType subjectFilterType : sfL) {
                subjectFilterTypeMap.put(subjectFilterType.getName(), subjectFilterType);
              }
            }
          }
        }
      }finally{
        lookupLock.unlock();
      }
    }
    return subjectFilterTypeMap.get(type);
  }

  // Allow to check whether there are also rights stored in db
  // Otherwise they may be given as subject attributes
  public static boolean rightsInDbAvailable() {
    return rightsInDbAvailable;
  }

  /**
   * Do not use directly, use getInstance() instead,
   * this class is expected to be only instantiated by JAXB as a singelton
   */
  protected SubjectSettings()
  {
  }
}