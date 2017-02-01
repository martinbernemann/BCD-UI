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
package de.businesscode.bcdui.binding.write;

import java.util.ArrayList;
import java.util.List;

public class PreProcessStylesheet {
  private String name;
  private final List<Param> params = new ArrayList<Param>();

  /**
   * PreProcessStylesheet
   */
  public PreProcessStylesheet() {
  }

  /**
   * PreProcessStylesheet
   *
   * @param name
   */
  public PreProcessStylesheet(String name) {
    super();
    this.name = name;
  }

  /**
   * @return the name
   */
  public final String getName() {
    return name;
  }

  /**
   * @param name
   *          the name to set
   */
  public final void setName(String name) {
    this.name = name;
  }

  /**
   * @return the params
   */
  public List<Param> getParams() {
    return params;
  }

}
